import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api";
import { attendeesCsv, attendeesXlsx } from "@/lib/attendees-export";
import { audit } from "@/lib/audit";
import { slugify } from "@/lib/codes";
import { db } from "@/lib/db";
import { attendeeQuerySchema, listAttendees } from "@/lib/events";
import { orgRoute } from "@/lib/org-route";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ orgId: string; id: string }> }) {
  try {
    const { user, org, event } = await orgRoute(params);
    const sp = Object.fromEntries(new URL(req.url).searchParams);
    const rows = await listAttendees(event!.id, attendeeQuerySchema.parse(sp));
    const { timezone } = await db.campus.findUniqueOrThrow({ where: { id: org.campusId } });
    const name = `peserta-${slugify(event!.title)}`;

    if (sp.format === "xlsx" || sp.format === "csv") {
      await audit("attendees.export", event!.id, { actorId: user.id, meta: { format: sp.format, rows: rows.length } });
    }
    if (sp.format === "xlsx") {
      const buf = await attendeesXlsx(rows, timezone, event!.title);
      return new Response(new Uint8Array(buf), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${name}.xlsx"`,
        },
      });
    }
    if (sp.format === "csv") {
      return new Response(`﻿${attendeesCsv(rows, timezone)}`, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${name}.csv"`,
        },
      });
    }
    return NextResponse.json({
      attendees: rows.map((t) => ({
        code: t.code,
        holderName: t.holderName,
        email: t.owner.email,
        ticketType: t.ticketType.name,
        orderCode: t.order.code,
        status: t.status,
        checkedInAt: t.checkedInAt,
      })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
