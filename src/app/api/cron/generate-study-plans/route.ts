import {NextRequest} from "next/server";
import {generateDailyStudyPlans} from "@/lib/services/studyPlanGenerator";

export async function POST(req: NextRequest) {
    console.log(req.body);
    await generateDailyStudyPlans()
    return new Response('Study plans generated', {status: 200});
}