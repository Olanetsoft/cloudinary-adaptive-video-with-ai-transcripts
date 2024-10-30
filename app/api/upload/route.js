"use server";
// app/api/upload/route.js
import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("video_file");
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64Video = `data:${file.type};base64,${buffer.toString("base64")}`;

    // Upload with VTT generation
    const uploadResult = await cloudinary.uploader.upload(base64Video, {
      resource_type: "video",
      public_id: `videos/${Date.now()}`,
      raw_convert: "google_speech:vtt", // Request VTT format
    });

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

    // Construct URLs following the documentation pattern
    const videoUrl = uploadResult.secure_url;
    const vttUrl = `https://res.cloudinary.com/${cloudName}/raw/upload/v${
      uploadResult.version + 1
    }/${uploadResult.public_id}.vtt`;

    return NextResponse.json({
      videoUrl,
      vttUrl,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload video" },
      { status: 500 }
    );
  }
}
