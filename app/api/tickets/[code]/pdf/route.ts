import { handleApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";
import { requireUser } from "@/lib/permissions";
import { renderTicketsPdf } from "@/pdf/ticket-pdf";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const user = await requireUser();
    const { code } = await params;
    const ticket = await db.ticket.findUnique({
      where: { code },
      include: { event: { include: { org: { include: { campus: true } } } }, ticketType: true, order: true },
    });
    if (!ticket || ticket.ownerId !== user.id) throw new NotFoundError("Tiket");
    const pdf = await renderTicketsPdf([ticket]);
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="e-tiket-${ticket.code}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
