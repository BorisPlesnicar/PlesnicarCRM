import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

// Helper function to format date for ICS (UTC with Z)
function formatICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

// Helper function to escape text for ICS
function escapeICS(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get("eventId");

    if (!eventId) {
      return NextResponse.json({ error: "eventId is required" }, { status: 400 });
    }

    const supabase = await createClient();

    // Get event from database
    const { data: event, error } = await supabase
      .from("events")
      .select("*")
      .eq("id", eventId)
      .single();

    if (error || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Ensure end_at is after start_at
    const startAt = new Date(event.start_at);
    const endAt = new Date(event.end_at);

    if (endAt <= startAt) {
      // Default to 1 hour duration if invalid
      endAt.setTime(startAt.getTime() + 60 * 60 * 1000);
    }

    // Generate UID (stable unique identifier)
    const uid = `${event.id}@plesnicarcrm.local`;

    // Build ICS content
    const icsLines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Plesnicar CRM//Calendar Integration//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${formatICSDate(new Date())}`,
      `DTSTART:${formatICSDate(startAt)}`,
      `DTEND:${formatICSDate(endAt)}`,
      `SUMMARY:${escapeICS(event.title)}`,
    ];

    if (event.description) {
      icsLines.push(`DESCRIPTION:${escapeICS(event.description)}`);
    }

    if (event.location) {
      icsLines.push(`LOCATION:${escapeICS(event.location)}`);
    }

    icsLines.push(
      "STATUS:CONFIRMED",
      "SEQUENCE:0",
      "END:VEVENT",
      "END:VCALENDAR"
    );

    const icsContent = icsLines.join("\r\n");

    // Return ICS file with iOS-friendly headers
    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="event-${event.id}.ics"`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (error: any) {
    console.error("ICS generation error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
