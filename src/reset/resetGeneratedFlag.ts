import { initDB, resetGeneratedImages } from "@/db";

const resetGeneratedFlag = async () => {
    const db: any = await initDB();
    resetGeneratedImages(db);
}

resetGeneratedFlag();
