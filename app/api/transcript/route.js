// app/api/transcript/route.js
import { NextResponse } from "next/server";

export async function GET(req) {
  const url = new URL(req.url).searchParams.get("url");
  if (!url) {
    return NextResponse.json({
      available: false,
      message: "Missing URL",
    });
  }

  try {
    console.log("Fetching from URL:", url); // Debug log

    const response = await fetch(url);

    // If file not found, still processing
    if (response.status === 404) {
      return NextResponse.json({
        available: false,
        message: "Transcript still processing",
      });
    }

    if (!response.ok) {
      return NextResponse.json({
        available: false,
        message: `Failed to fetch: ${response.status}`,
      });
    }

    const transcriptData = await response.json();

    if (!Array.isArray(transcriptData)) {
      return NextResponse.json({
        available: false,
        message: "Invalid transcript format",
      });
    }

    // Extract valid segments
    const segments = transcriptData
      .filter((item) => item && item.transcript && item.transcript.trim())
      .map((item) => ({
        text: item.transcript,
        confidence: item.confidence || 0,
        startTime: item.words?.[0]?.start_time || 0,
        endTime: item.words?.[item.words.length - 1]?.end_time || 0,
      }));

    // Only return available: true if we have valid segments
    if (segments.length > 0) {
      return NextResponse.json({
        available: true,
        transcript: segments.map((s) => s.text).join(" "),
        segments,
      });
    }

    return NextResponse.json({
      available: false,
      message: "No valid transcript content",
    });
  } catch (error) {
    return NextResponse.json({
      available: false,
      message: error.message,
    });
  }
}
