"use server";

import { supabase } from "@/lib/supabase";

export async function updateStudentPage(
  studentId: string,
  newPage: number
) {
  if (!Number.isInteger(newPage)) {
    throw new Error("Muka surat mesti nombor bulat.");
  }

  if (newPage < 1 || newPage > 604) {
    throw new Error("Muka surat mestilah antara 1 hingga 604.");
  }

  const { error } = await supabase
    .from("students")
    .update({
      current_page: newPage,
      updated_at: new Date().toISOString(),
    })
    .eq("id", studentId);

  if (error) {
    throw new Error(error.message);
  }
}