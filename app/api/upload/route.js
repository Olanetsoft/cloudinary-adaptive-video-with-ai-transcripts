// app/api/upload/route.js
import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.NEXT_PUBLIC_CLOUDINARY_API_SECRET,
});

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("video_file");
    const buffer = Buffer.from(await file.arrayBuffer());

    const base64Video = `data:${file.type};base64,${buffer.toString("base64")}`;

    // Simplified upload configuration
    const uploadResult = await cloudinary.uploader.upload(base64Video, {
      resource_type: "video",
      public_id: `videos/${Date.now()}`,
      raw_convert: "google_speech", // Keep it simple
    });

    const cloud_name = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

    // Construct URLs exactly as in the article
    const transcriptFiles = {
      json: `https://res.cloudinary.com/${cloud_name}/raw/upload/v${
        uploadResult.version + 1
      }/${uploadResult.public_id}.transcript`,
      vtt: `https://res.cloudinary.com/${cloud_name}/raw/upload/v${
        uploadResult.version + 1
      }/${uploadResult.public_id}.vtt`,
      srt: `https://res.cloudinary.com/${cloud_name}/raw/upload/v${
        uploadResult.version + 1
      }/${uploadResult.public_id}.srt`,
    };

    return NextResponse.json({
      videoUrl: uploadResult.secure_url,
      transcriptFiles,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Upload failed" },
      { status: 500 }
    );
  }
}
