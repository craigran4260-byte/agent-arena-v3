import { NextRequest, NextResponse } from 'next/server';
import { ChatService } from '@/lib/ChatService';
import { getRequiredUserId } from '@/lib/get-session';
import { UserService } from '@/lib/UserService';

/**
 * GET /api/tables/[tableId]/chat — Stream chat messages via SSE
 * Streams messages in real-time as they're sent to the table
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tableId: string }> }
) {
  const { tableId: tableIdStr } = await params;
  const tableId = parseInt(tableIdStr);

  if (isNaN(tableId)) {
    return NextResponse.json(
      { error: 'Invalid table ID' },
      { status: 400 }
    );
  }

  // Get chat history first
  try {
    const history = await ChatService.getHistory(tableId, 50);

    // Create readable stream for SSE
    const stream = new ReadableStream({
      async start(controller) {
        // Send history first
        controller.enqueue(
          new TextEncoder().encode(
            `data: ${JSON.stringify({ type: 'history', messages: history })}\n\n`
          )
        );

        // Subscribe to new messages
        let unsubscribe: (() => Promise<void>) | null = null;

        try {
          unsubscribe = await ChatService.subscribe(tableId, (message) => {
            controller.enqueue(
              new TextEncoder().encode(
                `data: ${JSON.stringify({ type: 'message', message })}\n\n`
              )
            );
          });
        } catch (error) {
          console.error('Failed to subscribe to chat:', error);
          controller.error(error);
        }

        // Handle client disconnect
        const abortHandler = async () => {
          if (unsubscribe) {
            try {
              await unsubscribe();
            } catch (err) {
              console.error('Failed to unsubscribe:', err);
            }
          }
          controller.close();
        };

        req.signal.addEventListener('abort', abortHandler);
      }
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });
  } catch (error) {
    console.error('Chat stream error:', error);
    return NextResponse.json(
      { error: 'Failed to stream chat' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tables/[tableId]/chat — Send a chat message
 * Body: { content: string }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tableId: string }> }
) {
  try {
    const userId = await getRequiredUserId();
    const { tableId: tableIdStr } = await params;
    const tableId = parseInt(tableIdStr);

    if (isNaN(tableId)) {
      return NextResponse.json(
        { error: 'Invalid table ID' },
        { status: 400 }
      );
    }

    const { content } = await req.json();

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message content required' },
        { status: 400 }
      );
    }

    if (content.length > 500) {
      return NextResponse.json(
        { error: 'Message too long (max 500 characters)' },
        { status: 400 }
      );
    }

    // Check if user is banned
    const isBanned = await ChatService.isBanned(tableId, userId);
    if (isBanned) {
      return NextResponse.json(
        { error: 'You are banned from this table chat' },
        { status: 403 }
      );
    }

    // Get user name
    const user = UserService.findById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Send message
    const message = await ChatService.sendMessage(
      tableId,
      userId,
      user.name,
      content.trim()
    );

    return NextResponse.json(message);
  } catch (error: any) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to send message' },
      { status: 500 }
    );
  }
}
