import { markNotificationAsRead } from "@/lib/notifications";
import {
  getValidatedServerSession,
  sessionInvalidatedJsonResponse,
} from "@/lib/serverSession";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PATCH(
  _request: Request,
  context: RouteContext<"/api/notifications/[id]">
) {
  const { invalidated, session } = await getValidatedServerSession();
  if (invalidated) return sessionInvalidatedJsonResponse();

  const email = session?.user?.email?.trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const notification = await markNotificationAsRead(email, id);

    if (!notification) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(
      { notification },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Update notification failed",
      },
      { status: 500 }
    );
  }
}
