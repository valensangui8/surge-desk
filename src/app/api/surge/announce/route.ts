import { draftAnnouncement } from "@/lib/surgeAi";

export async function POST(req: Request) {
  const { incident, languages } = await req.json();
  return Response.json(await draftAnnouncement(incident, languages));
}
