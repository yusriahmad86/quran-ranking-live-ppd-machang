"use client";



import Link from "next/link";



import {



  ChangeEvent,



  FormEvent,



  useEffect,



  useMemo,



  useState,



} from "react";



import { supabase } from "@/lib/supabase";



type School = {



  id: string;



  code: string;



  name: string;



};



type Participant = {



  id: string;



  name: string;



  photo_url: string | null;



  current_page: number;



  grandmaster_at: string | null;



  school_id: string;



  group_number: number | null;



  has_read_today: boolean;



};



type ReadingRecord = {



  id: string;



  page_from: number;



  page_to: number;



  pages_read: number;



  reading_date: string;



  created_at: string;



};



type PageInputs = Record<string, string>;



type DailyStartPage = {



  id: string;



  participant_id: string;



  reading_date: string;



  start_page: number;



};



function getMalaysiaDate() {



  const parts = new Intl.DateTimeFormat("en-GB", {



    timeZone: "Asia/Kuala_Lumpur",



    year: "numeric",



    month: "2-digit",



    day: "2-digit",



  }).formatToParts(new Date());



  const values = Object.fromEntries(



    parts



      .filter((part) => part.type !== "literal")



      .map((part) => [part.type, part.value])



  );



  return `${values.year}-${values.month}-${values.day}`;



}



function formatSelectedDate(dateString: string) {



  if (!dateString) {



    return "";



  }



  const [year, month, day] = dateString



    .split("-")



    .map(Number);



  const date = new Date(



    year,



    month - 1,



    day



  );



  return date.toLocaleDateString("ms-MY", {



    day: "numeric",



    month: "long",



    year: "numeric",



  });



}



export default function GuruPage() {



  const [schools, setSchools] = useState<School[]>([]);



  const [participants, setParticipants] = useState<Participant[]>([]);



  const [records, setRecords] = useState<ReadingRecord[]>([]);



  const [selectedGroup, setSelectedGroup] = useState("1");



  const [pageInputs, setPageInputs] = useState<PageInputs>({});



  const [selectedParticipantId, setSelectedParticipantId] =



    useState("");



  const [recordsParticipantId, setRecordsParticipantId] =



    useState("");



  // =====================================================



  // TARIKH SEMAKAN REKOD



  // =====================================================



  const [selectedRecordDate, setSelectedRecordDate] =



    useState(getMalaysiaDate());



  // =====================================================



  // MUKASURAT PERMULAAN HARI INI



  // =====================================================



  const [dailyStartPages, setDailyStartPages] =



    useState<PageInputs>({});



  const [savedDailyStartPageIds, setSavedDailyStartPageIds] =



    useState<Record<string, boolean>>({});



  const [savingDailyStartPageId, setSavingDailyStartPageId] =



    useState("");



  const [showDailyStartPages, setShowDailyStartPages] =



    useState(false);



  const [loading, setLoading] = useState(true);



  const [savingAllReadings, setSavingAllReadings] = useState(false);



  const [uploadingPhoto, setUploadingPhoto] = useState(false);



  const [error, setError] = useState("");



  const [success, setSuccess] = useState("");



  const [showReadingSavedPopup, setShowReadingSavedPopup] = useState(false);



  const selectedParticipant = participants.find(



    (participant) => participant.id === selectedParticipantId



  );



  const recordsParticipant = participants.find(



    (participant) => participant.id === recordsParticipantId



  );



  // =====================================================



  // STATUS BACAAN HARI INI



  // =====================================================



  const filledCount = participants.filter(



    (participant) => participant.has_read_today



  ).length;



  const remainingCount =



    participants.length - filledCount;



  const selectedDatePages = useMemo(



    () =>



      records.reduce(



        (total, record) =>



          total + (record.pages_read ?? 0),



        0



      ),



    [records]



  );



  const groups = Array.from(



    { length: 10 },



    (_, index) => index + 1



  );



  function getSchoolForParticipant(



    participant: Participant



  ) {



    return schools.find(



      (school) =>



        school.id === participant.school_id



    );



  }



  // =====================================================



  // LOAD SEKOLAH



  // =====================================================



  async function loadSchools() {



    const { data, error } = await supabase.rpc(



      "get_active_schools"



    );



    if (error) {



      setError(



        `Gagal memuatkan senarai sekolah: ${error.message}`



      );



      setSchools([]);



      return;



    }



    const schoolData =



      (data ?? []) as School[];



    setSchools(schoolData);



  }



  // =====================================================



  // LOAD PESERTA MENGIKUT KUMPULAN



  // =====================================================



  async function loadParticipants(



    groupNumber: string



  ) {



    if (!groupNumber) {



      setParticipants([]);



      setPageInputs({});



      setShowDailyStartPages(false);



      return;



    }



    setError("");



    const { data, error } =



      await supabase.rpc(



        "get_group_participants",



        {



          p_group_number:



            Number(groupNumber),



        }



      );



    if (error) {



      setError(



        `Gagal memuatkan peserta Kumpulan ${groupNumber}: ${error.message}`



      );



      setParticipants([]);



      return;



    }



    const participantData =



      (data ?? []) as Participant[];



    setParticipants(



      participantData



    );



    setPageInputs({});



    setDailyStartPages({});



    setSavedDailyStartPageIds({});



    setShowDailyStartPages(false);



    setSelectedParticipantId("");



    setRecordsParticipantId("");



    setRecords([]);



    await loadDailyStartPages(participantData);



  }



  // =====================================================



  // LOAD MUKASURAT PERMULAAN HARI INI



  // =====================================================



  async function loadDailyStartPages(



    participantData: Participant[]



  ) {



    if (participantData.length === 0) {



      setDailyStartPages({});



      setSavedDailyStartPageIds({});



      return;



    }



    const today = getMalaysiaDate();



    const participantIds = participantData.map(



      (participant) => participant.id



    );



    const { data, error } = await supabase



      .from("daily_start_pages")



      .select("id, participant_id, reading_date, start_page")



      .in("participant_id", participantIds)



      .eq("reading_date", today);



    if (error) {



      setError(`Gagal memuatkan mukasurat permulaan: ${error.message}`);



      return;



    }



    const startPageData = (data ?? []) as DailyStartPage[];



    const pageMap: PageInputs = {};



    const savedMap: Record<string, boolean> = {};



    for (const row of startPageData) {



      pageMap[row.participant_id] = String(row.start_page);



      savedMap[row.participant_id] = true;



    }



    setDailyStartPages(pageMap);



    setSavedDailyStartPageIds(savedMap);



    // Sentiasa minimize secara default.

    // Guru boleh buka bahagian ini secara manual apabila diperlukan.

    setShowDailyStartPages(false);



  }



  async function handleSaveDailyStartPage(participant: Participant) {



    const value = dailyStartPages[participant.id]?.trim() ?? "";







    setError("");



    setSuccess("");







    if (value === "") {



      setError(`Sila masukkan mukasurat permulaan untuk ${participant.name}.`);



      return;



    }







    const startPage = Number(value);







    if (!Number.isInteger(startPage) || startPage < 0 || startPage > 604) {



      setError(



        `Mukasurat permulaan ${participant.name} mestilah antara 0 hingga 604.`



      );



      return;



    }







    if (startPage < participant.current_page) {



      setError(



        `${participant.name}: mukasurat permulaan (${startPage}) tidak boleh kurang daripada kemajuan semasa (${participant.current_page}).`



      );



      return;



    }







    setSavingDailyStartPageId(participant.id);







    const { error } = await supabase



      .from("daily_start_pages")



      .upsert(



        {



          participant_id: participant.id,



          reading_date: getMalaysiaDate(),



          start_page: startPage,



        },



        {



          onConflict: "participant_id,reading_date",



        }



      );







    if (error) {



      setError(`Gagal menyimpan mukasurat permulaan: ${error.message}`);



      setSavingDailyStartPageId("");



      return;



    }







    setSavedDailyStartPageIds((current) => ({



      ...current,



      [participant.id]: true,



    }));







    const nextSaved = participants.every(



      (item) =>



        item.id === participant.id ||



        savedDailyStartPageIds[item.id] === true



    );







    setSuccess(



      `✅ Mukasurat permulaan ${participant.name} berjaya disimpan untuk ${formatSelectedDate(getMalaysiaDate())}.`



    );







    if (nextSaved) {



      setShowDailyStartPages(false);



    }







    setSavingDailyStartPageId("");



  }



  function handleDailyStartPageChange(



    participantId: string,



    value: string



  ) {



    setDailyStartPages((current) => ({



      ...current,



      [participantId]: value,



    }));



    setSavedDailyStartPageIds((current) => ({



      ...current,



      [participantId]: false,



    }));



    setError("");



    setSuccess("");



  }



  // =====================================================



  // LOAD REKOD BACAAN MENGIKUT TARIKH



  // =====================================================



  async function loadRecords(



    participantId: string,



    recordDate: string



  ) {



    if (



      !participantId ||



      !recordDate



    ) {



      setRecords([]);



      return;



    }



    const { data, error } =



      await supabase



        .from("reading_records")



        .select(



          "id, page_from, page_to, pages_read, reading_date, created_at"



        )



        .eq(



          "participant_id",



          participantId



        )



        .eq(



          "reading_date",



          recordDate



        )



        .is(



          "voided_at",



          null



        )



        .eq(



          "is_baseline",



          false



        )



        .order(



          "created_at",



          {



            ascending: false,



          }



        );



    if (error) {



      setError(



        `Gagal memuatkan rekod: ${error.message}`



      );



      return;



    }



    setRecords(data ?? []);



  }



  // =====================================================



  // UPLOAD GAMBAR



  // =====================================================



  async function uploadParticipantPhoto(



    participantId: string,



    file: File



  ) {



    if (!file.type.startsWith("image/")) {



      throw new Error(



        "Sila pilih fail gambar."



      );



    }



    if (



      file.size >



      15 * 1024 * 1024



    ) {



      throw new Error(



        "Gambar asal terlalu besar. Had gambar asal ialah 15 MB."



      );



    }



    const image =



      await createImageBitmap(file);



    // ===================================================



    // COMPRESSION GAMBAR



    // Maksimum 800px + sasaran 250KB



    // ===================================================



    const maxDimension = 800;



    const targetSize = 250 * 1024;



    const scale = Math.min(



      1,



      maxDimension /



        Math.max(



          image.width,



          image.height



        )



    );



    const width = Math.max(



      1,



      Math.round(



        image.width * scale



      )



    );



    const height = Math.max(



      1,



      Math.round(



        image.height * scale



      )



    );



    const canvas =



      document.createElement(



        "canvas"



      );



    canvas.width = width;



    canvas.height = height;



    const context =



      canvas.getContext("2d");



    if (!context) {



      image.close();



      throw new Error(



        "Gagal memproses gambar."



      );



    }



    context.imageSmoothingEnabled =



      true;



    context.imageSmoothingQuality =



      "high";



    context.drawImage(



      image,



      0,



      0,



      width,



      height



    );



    image.close();



    let quality = 0.85;



    let blob: Blob | null = null;



    while (quality >= 0.4) {



      blob =



        await new Promise<Blob | null>(



          (resolve) => {



            canvas.toBlob(



              resolve,



              "image/jpeg",



              quality



            );



          }



        );



      if (



        blob &&



        blob.size <= targetSize



      ) {



        break;



      }



      quality -= 0.1;



    }



    if (!blob) {



      throw new Error(



        "Gagal memampatkan gambar."



      );



    }



    if (



      blob.size >



      3 * 1024 * 1024



    ) {



      throw new Error(



        "Gambar masih melebihi had 3 MB selepas compression."



      );



    }



    const compressedFile =



      new File(



        [blob],



        "participant-photo.jpg",



        {



          type: "image/jpeg",



        }



      );



    const path =



      `${participantId}/profile.jpg`;



    const {



      error: uploadError,



    } =



      await supabase.storage



        .from(



          "participant-photos"



        )



        .upload(



          path,



          compressedFile,



          {



            upsert: true,



            contentType:



              "image/jpeg",



            cacheControl:



              "3600",



          }



        );



    if (uploadError) {



      throw new Error(



        uploadError.message



      );



    }



    const {



      data: {



        publicUrl,



      },



    } =



      supabase.storage



        .from(



          "participant-photos"



        )



        .getPublicUrl(path);



    const photoUrl =



      `${publicUrl}?v=${Date.now()}`;



    const {



      error: photoError,



    } =



      await supabase.rpc(



        "update_participant_photo",



        {



          p_participant_id:



            participantId,



          p_photo_url:



            photoUrl,



        }



      );



    if (photoError) {



      throw new Error(



        photoError.message



      );



    }



  }



  // =====================================================



  // INITIALISE



  // =====================================================



  useEffect(() => {



    async function initialise() {



      setLoading(true);



      setError("");



      await loadSchools();



      setLoading(false);



    }



    void initialise();



  }, []);



  // =====================================================



  // BILA KUMPULAN BERUBAH



  // =====================================================



  useEffect(() => {



    void loadParticipants(



      selectedGroup



    );



  }, [selectedGroup]);



  // =====================================================



  // BILA PESERTA REKOD / TARIKH BERUBAH



  // =====================================================



  useEffect(() => {



    if (



      !recordsParticipantId ||



      !selectedRecordDate



    ) {



      setRecords([]);



      return;



    }



    void loadRecords(



      recordsParticipantId,



      selectedRecordDate



    );



  }, [



    recordsParticipantId,



    selectedRecordDate,



  ]);



  // =====================================================



  // INPUT MUKA SURAT



  // =====================================================



  function handlePageInputChange(



    participantId: string,



    value: string



  ) {



    setPageInputs(



      (current) => ({



        ...current,



        [participantId]:



          value,



      })



    );



    setError("");



    setSuccess("");



  }



  // =====================================================



  // HANTAR SEMUA BACAAN



  // =====================================================



  async function handleSubmitAllReadings(



    event: FormEvent<HTMLFormElement>



  ) {



    event.preventDefault();



    setError("");



    setSuccess("");



    const entries =



      participants



        .map(



          (participant) => ({



            participant,



            value:



              pageInputs[



                participant.id



              ]?.trim() ?? "",



          })



        )



        .filter(



          (entry) =>



            savedDailyStartPageIds[entry.participant.id] === true &&



            entry.value !== ""



        );



    if (



      entries.length === 0



    ) {



      setError(



        "Sila masukkan sekurang-kurangnya satu muka surat."



      );



      return;



    }



    for (const entry of entries) {



      const pageTo =



        Number(entry.value);



      const startPage = Number(



        dailyStartPages[entry.participant.id]



      );



      if (



        !Number.isInteger(startPage) ||



        savedDailyStartPageIds[entry.participant.id] !== true



      ) {



        setError(



          `${entry.participant.name}: sila simpan mukasurat permulaan terlebih dahulu.`



        );



        return;



      }



      if (



        !Number.isInteger(



          pageTo



        ) ||



        pageTo < 1 ||



        pageTo > 604



      ) {



        setError(



          `Muka surat untuk ${entry.participant.name} mestilah antara 1 hingga 604.`



        );



        return;



      }



      if (pageTo <= startPage) {



        setError(



          `${entry.participant.name}: muka surat bacaan (${pageTo}) mesti lebih daripada mukasurat permulaan hari ini (${startPage}).`



        );



        return;



      }



    }



    setSavingAllReadings(



      true



    );



    const savedNames: string[] =



      [];



    const failedNames: string[] =



      [];



    for (



      const entry of entries



    ) {



      const pageTo =



        Number(entry.value);



      const {



        error,



      } =



        await supabase.rpc(



          "record_reading",



          {



            p_participant_id:



              entry



                .participant



                .id,



            p_page_to:



              pageTo,



            p_note:



              null,



          }



        );



      if (error) {



        failedNames.push(



          `${entry.participant.name}: ${error.message}`



        );



      } else {



        savedNames.push(



          entry.participant.name



        );



      }



    }



    await loadParticipants(



      selectedGroup



    );



    setPageInputs({});



    if (



      failedNames.length === 0



    ) {



      setSuccess(



        `✅ Semua bacaan berjaya disimpan untuk ${savedNames.length} peserta.`



      );



      setShowReadingSavedPopup(true);



    } else if (



      savedNames.length > 0



    ) {



      setSuccess(



        `✅ ${savedNames.length} bacaan berjaya disimpan.`



      );



      setShowReadingSavedPopup(true);



      setError(



        `⚠️ ${failedNames.length} bacaan gagal:\n${failedNames.join(



          "\n"



        )}`



      );



    } else {



      setError(



        `❌ Semua bacaan gagal disimpan:\n${failedNames.join(



          "\n"



        )}`



      );



    }



    setSavingAllReadings(



      false



    );



  }



  // =====================================================



  // PILIH PESERTA



  // =====================================================



  function handleSelectParticipant(



    participantId: string



  ) {



    setSelectedParticipantId(



      participantId



    );



    setRecordsParticipantId(



      participantId



    );



    setError("");



    setSuccess("");



  }



  // =====================================================



  // TUKAR GAMBAR



  // =====================================================



  async function handleSelectedPhotoChange(



    event: ChangeEvent<HTMLInputElement>



  ) {



    const file =



      event.target.files?.[0];



    const participantId =



      selectedParticipantId;



    if (



      !file ||



      !participantId



    ) {



      return;



    }



    setUploadingPhoto(true);



    setError("");



    setSuccess("");



    try {



      await uploadParticipantPhoto(



        participantId,



        file



      );



      await loadParticipants(



        selectedGroup



      );



      setSelectedParticipantId(



        participantId



      );



      setRecordsParticipantId(



        participantId



      );



      setSuccess(



        "Gambar peserta berjaya dikemas kini."



      );



    } catch (



      uploadError



    ) {



      const message =



        uploadError instanceof Error



          ? uploadError.message



          : "Gagal memuat naik gambar.";



      setError(message);



    }



    event.target.value = "";



    setUploadingPhoto(false);



  }



  // =====================================================



  // LOADING



  // =====================================================



  if (loading) {



    return (



      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-center text-white">



        Memuatkan pengisian bacaan…



      </main>



    );



  }



  // =====================================================



  // UI



  // =====================================================



  return (

    <>

      {showReadingSavedPopup && (



        <div

          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"

          role="dialog"

          aria-modal="true"

          aria-label="Bacaan berjaya disimpan"

          onMouseDown={(event) => {

            if (event.target === event.currentTarget) {

              setShowReadingSavedPopup(false);

            }

          }}

        >



          <div className="w-full max-w-md rounded-3xl border border-emerald-400/30 bg-slate-900 p-7 text-center shadow-[0_0_60px_rgba(16,185,129,0.22)]">



            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-4 border-emerald-400/40 bg-emerald-500/10 text-4xl">



              ✓



            </div>



            <h2 className="mt-5 text-2xl font-black text-white">



              Data Berjaya Disimpan!



            </h2>



            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">



              Rekod bacaan peserta telah berjaya disimpan.



            </p>



            <button

              type="button"

              onClick={() => setShowReadingSavedPopup(false)}

              className="w-full rounded-2xl bg-yellow-500 px-5 py-4 text-sm font-black text-slate-950 transition hover:bg-yellow-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 sm:w-auto"

            >



              OK, Teruskan



            </button>



          </div>



        </div>



      )}



      <main className="min-h-screen bg-slate-950 text-white">





      {/* HEADER */}



      <header className="border-b border-white/10 bg-slate-900">



        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6">



          <div>



            <h1 className="text-lg font-black sm:text-xl">



              📖 QURAN RANKING{" "}



              <span className="text-emerald-400">



                LIVE



              </span>



            </h1>



            <p className="mt-1 text-[10px] text-slate-400 sm:text-xs">



              PROGRAM KHATAM MURID · PPD MACHANG



            </p>



          </div>



          <div className="flex gap-2">



            <Link



              href="/dashboard"



              className="rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/20 sm:px-4 sm:text-sm"



            >



              Dashboard



            </Link>



            <Link



              href="/ranking"



              className="rounded-xl bg-yellow-500 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-yellow-400 sm:px-4 sm:text-sm"



            >



              🏆 Ranking



            </Link>



          </div>



        </div>



      </header>



      <section className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-10">



        <p className="text-sm font-semibold text-emerald-400">



          PENGISIAN BACAAN



        </p>



        <h2 className="mt-2 text-3xl font-black sm:text-4xl">



          Rekod Bacaan Kumpulan



        </h2>



        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">



          Pilih kumpulan dan masukkan bacaan semua peserta secara pukal.



        </p>



        {/* ERROR */}



        {error && (



          <div className="mt-6 whitespace-pre-line rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm leading-6 text-red-300">



            ❌ {error}



          </div>



        )}



        {/* SUCCESS */}



        {success && (



          <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm leading-6 text-emerald-300">



            {success}



          </div>



        )}



        {/* =================================================



            KUMPULAN



        ================================================== */}



        <div className="mt-7 rounded-3xl border border-emerald-500/20 bg-slate-900 p-5 sm:p-7">



          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">



            <div className="w-full flex-1">



              <p className="text-xs font-semibold text-emerald-400">



                LANGKAH 1



              </p>



              <h3 className="mt-1 text-xl font-black sm:text-2xl">



                📋 Pilih Kumpulan



              </h3>



              <p className="mt-1 text-sm text-slate-400">



                Setiap kumpulan boleh mengandungi peserta daripada pelbagai sekolah.



              </p>



              <select



                value={selectedGroup}



                onChange={(event) => {



                  setSelectedGroup(



                    event.target.value



                  );



                  setError("");



                  setSuccess("");



                }}



                className="mt-4 w-full rounded-2xl border border-white/10 bg-slate-800 px-4 py-4 text-base font-bold text-white outline-none focus:border-emerald-400 sm:text-lg"



              >



                {groups.map(



                  (group) => (



                    <option



                      key={group}



                      value={group}



                    >



                      Kumpulan {group}



                    </option>



                  )



                )}



              </select>



            </div>



            <div className="grid grid-cols-3 gap-2 md:w-[360px]">



              <div className="rounded-2xl bg-slate-800 p-3 text-center sm:p-4">



                <p className="text-[10px] font-bold text-slate-500">



                  PESERTA



                </p>



                <p className="mt-1 text-2xl font-black text-white">



                  {participants.length}



                </p>



              </div>



              <div className="rounded-2xl bg-emerald-500/10 p-3 text-center sm:p-4">



                <p className="text-[10px] font-bold text-emerald-400">



                  SUDAH ISI



                </p>



                <p className="mt-1 text-2xl font-black text-emerald-400">



                  {filledCount}



                </p>



              </div>



              <div className="rounded-2xl bg-yellow-500/10 p-3 text-center sm:p-4">



                <p className="text-[10px] font-bold text-yellow-400">



                  BELUM ISI



                </p>



                <p className="mt-1 text-2xl font-black text-yellow-400">



                  {remainingCount}



                </p>



              </div>



            </div>



          </div>



        </div>



                {/* =================================================



            MUKASURAT PERMULAAN HARI INI



        ================================================== */}



        <div className="mt-6 rounded-3xl border border-yellow-500/20 bg-slate-900 p-5 sm:p-7">



          <button



            type="button"



            onClick={() => setShowDailyStartPages((current) => !current)}



            className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"



          >



            <div>



              <div className="flex items-center gap-3">



                <p className="text-xs font-semibold text-yellow-400">LANGKAH 2</p>



                <span className="rounded-full bg-yellow-500/10 px-2.5 py-1 text-[10px] font-black text-yellow-300">



                  {Object.values(savedDailyStartPageIds).filter(Boolean).length}/{participants.length} DISIMPAN



                </span>



              </div>



              <h3 className="mt-1 text-xl font-black sm:text-2xl">



                📖 Mukasurat Permulaan



              </h3>



              <p className="mt-1 text-sm text-slate-500">



                Tetapkan titik mula setiap peserta sebelum merekod bacaan harian.



              </p>



            </div>



            <div className="flex items-center gap-3">



              <span className="rounded-xl bg-yellow-500/10 px-4 py-3 text-xs text-yellow-300 sm:text-sm">



                📅 {formatSelectedDate(getMalaysiaDate())}



              </span>



              <span className="rounded-xl bg-white/5 px-3 py-3 text-lg font-black text-slate-300">



                <span className="text-blue-400 font-normal">
  {showDailyStartPages ? "Tutup" : "Buka"}
</span>



              </span>



            </div>



          </button>







          {showDailyStartPages && (



            participants.length > 0 ? (



              <>



                <div className="mt-5 space-y-3">



                  {participants.map((participant, index) => {



                    const school = getSchoolForParticipant(participant);



                    const startPageValue = dailyStartPages[participant.id] ?? "";



                    const isSaved = savedDailyStartPageIds[participant.id] === true;



                    const isSaving = savingDailyStartPageId === participant.id;







                    return (



                      <div



                        key={participant.id}



                        className={`rounded-2xl border p-4 transition ${



                          isSaved



                            ? "border-emerald-500/30 bg-emerald-500/5"



                            : "border-white/5 bg-slate-800/70"



                        }`}



                      >



                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">



                          <div className="min-w-0">



                            <p className="font-black leading-5">



                              {index + 1}. {participant.name}



                            </p>



                            <p className="mt-1 truncate text-xs text-slate-500">



                              {school?.code ?? "—"} · {school?.name ?? "Sekolah tidak ditemui"}



                            </p>



                            <p className="mt-2 text-xs text-slate-500">



                              Kemajuan semasa: {participant.current_page}/604



                            </p>



                          </div>







                          <div className="w-full sm:w-56">



                            <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500">



                              Mukasurat Permulaan Hari Ini



                            </label>



                            <div className="mt-1 flex gap-2">



                              <input



                                type="number"



                                min="0"



                                max="604"



                                inputMode="numeric"



                                value={startPageValue}



                                onChange={(event) =>



                                  handleDailyStartPageChange(



                                    participant.id,



                                    event.target.value



                                  )



                                }



                                placeholder="Masukkan muka surat"



                                className={`min-w-0 flex-1 rounded-xl border px-3 py-3 text-center text-lg font-black text-white outline-none transition ${



                                  isSaved



                                    ? "border-emerald-500/30 bg-emerald-500/10"



                                    : "border-white/10 bg-slate-900"



                                } focus:border-yellow-400`}



                              />



                              <button



                                type="button"



                                onClick={() => void handleSaveDailyStartPage(participant)}



                                disabled={isSaving}



                                className="rounded-xl bg-yellow-500 px-4 py-3 text-xs font-black text-slate-950 transition hover:bg-yellow-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"



                              >



                                {isSaving ? "⏳" : "💾 Simpan"}



                              </button>



                            </div>



                            {isSaved && (



                              <p className="mt-1 text-center text-[10px] font-bold text-emerald-400">



                                ✓ SUDAH DISIMPAN



                              </p>



                            )}



                          </div>



                        </div>



                      </div>



                    );



                  })}



                </div>







                <div className="mt-4 rounded-xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-3 text-xs leading-5 text-yellow-300">



                  ⚠️ Mukasurat permulaan tidak boleh kurang daripada kemajuan semasa peserta. Simpan setiap peserta menggunakan butang di sebelah kotak.



                </div>







                <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs leading-5 text-red-300">



                  🔒 Setiap peserta hanya boleh diisi bacaan selepas mukasurat permulaan peserta tersebut disimpan.



                </div>



              </>



            ) : (



              <div className="mt-5 rounded-2xl border border-white/5 bg-slate-800 p-8 text-center">



                <p className="text-sm text-slate-500">Tiada peserta dalam Kumpulan {selectedGroup}.</p>



              </div>



            )



          )}



        </div>



{/* =================================================



            SENARAI PESERTA



        ================================================== */}



        <form



          onSubmit={



            handleSubmitAllReadings



          }



          className="mt-6"



        >



          <div className="rounded-3xl border border-white/10 bg-slate-900 p-4 sm:p-7">



            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">



              <div>



                <p className="text-xs font-semibold text-emerald-400">



                  LANGKAH 3



                </p>



                <h3 className="mt-1 text-xl font-black sm:text-2xl">



                  📖 Masukkan Bacaan



                </h3>



              </div>



              <div className="rounded-xl bg-emerald-500/10 px-4 py-3 text-xs text-emerald-300 sm:text-sm">



                Kosongkan jika peserta tidak membaca hari ini.



              </div>



            </div>



            {participants.length > 0 ? (



              <div className="mt-5 space-y-3">



                {participants.map(



                  (



                    participant,



                    index



                  ) => {



                    const school =



                      getSchoolForParticipant(



                        participant



                      );



                    const inputValue =



                      pageInputs[



                        participant.id



                      ] ?? "";



                    const hasInput =



                      inputValue.trim() !== "";



                    const dailyStartPageValue =



                      dailyStartPages[participant.id];



                    const currentReadingPage =

                      participant.has_read_today

                        ? participant.current_page

                        : savedDailyStartPageIds[participant.id] === true &&

                          dailyStartPageValue !== undefined &&

                          dailyStartPageValue.trim() !== ""

                          ? Number(dailyStartPageValue)

                          : participant.current_page;

                    return (



                      <div



                        key={



                          participant.id



                        }



                        className={`rounded-2xl border p-4 transition ${



                          participant.has_read_today



                            ? "border-emerald-500/30 bg-emerald-500/5"



                            : hasInput



                            ? "border-yellow-500/30 bg-yellow-500/5"



                            : "border-white/5 bg-slate-800/70"



                        }`}



                      >



                        <div className="flex gap-3">



                          <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl bg-slate-700 sm:h-14 sm:w-14">



                            {participant.photo_url ? (



                              <img



                                src={



                                  participant.photo_url



                                }



                                alt={



                                  participant.name



                                }



                                className="h-full w-full object-cover"



                              />



                            ) : (



                              <div className="flex h-full w-full items-center justify-center text-2xl">



                                👤



                              </div>



                            )}



                          </div>



                          <div className="min-w-0 flex-1">



                            <div className="flex items-start justify-between gap-2">



                              <div className="min-w-0">



                                <p className="font-black leading-5">



                                  {index +



                                    1}



                                  .{" "}



                                  {



                                    participant.name



                                  }



                                </p>



                                <p className="mt-1 truncate text-xs text-slate-500">



                                  {



                                    school?.code ??



                                    "—"



                                  }{" "}



                                  ·{" "}



                                  {



                                    school?.name ??



                                    "Sekolah tidak ditemui"



                                  }



                                </p>



                              </div>



                              {participant.has_read_today ? (



                                <span className="flex-shrink-0 rounded-lg bg-emerald-500/15 px-2 py-1 text-[10px] font-black text-emerald-400">



                                  ✓ SUDAH ISI



                                </span>



                              ) : hasInput ? (



                                <span className="flex-shrink-0 rounded-lg bg-yellow-500/15 px-2 py-1 text-[10px] font-black text-yellow-400">



                                  ⏳ AKAN ISI



                                </span>



                              ) : null}



                            </div>



                            <div className="mt-4 grid grid-cols-2 gap-3">



                              <div className="rounded-xl bg-slate-900/80 p-3">



                                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">



                                  Semasa



                                </p>



                                <p className="mt-1 text-xl font-black text-emerald-400">



                                  {



                                    currentReadingPage



                                  }



                                  <span className="ml-1 text-xs font-medium text-slate-500">



                                    /604



                                  </span>



                                </p>



                              </div>



                              <div>



                                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">



                                  Bacaan Baharu



                                </p>



                                <input



                                  type="number"



                                  min={currentReadingPage + 1}



                                  max="604"



                                  inputMode="numeric"



                                  value={



                                    inputValue



                                  }



                                  onChange={(



                                    event



                                  ) =>



                                    handlePageInputChange(



                                      participant.id,



                                      event



                                        .target



                                        .value



                                    )



                                  }



                                  disabled={



                                    savedDailyStartPageIds[participant.id] !== true



                                  }



                                  placeholder={



                                    savedDailyStartPageIds[participant.id] === true



                                      ? `> ${currentReadingPage}`



                                      : "Simpan mukasurat permulaan dahulu"



                                  }



                                  className={`mt-1 w-full rounded-xl border px-3 py-3 text-center text-lg font-black text-white outline-none transition ${



                                    hasInput



                                      ? "border-yellow-500/40 bg-yellow-500/10"



                                      : "border-white/10 bg-slate-900"



                                  } focus:border-emerald-400`}



                                />



                              </div>



                            </div>



                            {savedDailyStartPageIds[participant.id] !== true && (



                              <div className="mt-3">



                                <span className="rounded-lg bg-slate-900/80 px-3 py-1 text-xs font-bold text-slate-500">



                                  🔒 Simpan mukasurat permulaan dahulu



                                </span>



                              </div>



                            )}



                            {participant.has_read_today && (



                              <div className="mt-3">



                                <span className="rounded-lg bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">



                                  📖 Bacaan hari ini telah direkodkan



                                </span>



                              </div>



                            )}



                            {participant.grandmaster_at && (



                              <div className="mt-3">



                                <span className="rounded-lg bg-yellow-500/10 px-3 py-1 text-xs font-black text-yellow-400">



                                  👑 GRANDMASTER



                                </span>



                              </div>



                            )}



                          </div>



                        </div>



                      </div>



                    );



                  }



                )}



              </div>



            ) : (



              <div className="mt-5 rounded-2xl border border-white/5 bg-slate-800 p-8 text-center">



                <p className="text-4xl">



                  👥



                </p>



                <p className="mt-3 font-bold text-slate-300">



                  Tiada peserta dalam Kumpulan{" "}



                  {selectedGroup}



                </p>



                <p className="mt-1 text-sm text-slate-500">



                  Sila gunakan menu{" "}



                  <span className="font-bold text-emerald-400">



                    Daftar Murid



                  </span>{" "}



                  di Dashboard untuk menambah peserta.



                </p>



              </div>



            )}



            {participants.length > 0 && (



              <div className="mt-6">



                <div className="mb-3 flex items-center justify-between text-xs">



                  <span className="text-slate-500">



                    Status bacaan hari ini



                  </span>



                  <span className="font-bold text-emerald-400">



                    {filledCount} /{" "}



                    {participants.length}



                  </span>



                </div>



                <div className="mb-5 h-2 overflow-hidden rounded-full bg-slate-800">



                  <div



                    className="h-full rounded-full bg-emerald-500 transition-all"



                    style={{



                      width:



                        participants.length >



                        0



                          ? `${Math.round(



                              (filledCount /



                                participants.length) *



                                100



                            )}%`



                          : "0%",



                    }}



                  />



                </div>



                <button



                  type="submit"



                  disabled={



                    savingAllReadings ||



                    !participants.some(



                      (participant) =>



                        savedDailyStartPageIds[participant.id] === true &&



                        !!pageInputs[participant.id]?.trim()



                    )



                  }



                  className="w-full rounded-2xl bg-emerald-500 py-5 text-base font-black text-slate-950 shadow-lg shadow-emerald-500/10 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 sm:text-lg"



                >



                  {savingAllReadings



                    ? "⏳ Sedang menyimpan semua bacaan…"



                    : "📖 HANTAR BACAAN YANG DIISI"}



                </button>



              </div>



            )}



          </div>



        </form>



        {/* =================================================



            REKOD PESERTA



        ================================================== */}



        <div className="mt-6 grid gap-6 lg:grid-cols-2">



          {/* SEMAKAN */}



          <div className="rounded-3xl border border-white/10 bg-slate-900 p-5 sm:p-7">



            <p className="text-xs font-semibold text-emerald-400">



              SEMAKAN



            </p>



            <h3 className="mt-1 text-xl font-bold">



              👤 Lihat Rekod Peserta



            </h3>



            {/* TARIKH SEMAKAN */}



            <div className="mt-5">



              <label className="text-sm font-semibold text-slate-300">



                📅 Tarikh Rekod



              </label>



              <input



                type="date"



                value={selectedRecordDate}



                max={getMalaysiaDate()}



                onChange={(event) => {



                  setSelectedRecordDate(



                    event.target.value



                  );



                  setError("");



                  setSuccess("");



                }}



                className="mt-2 w-full min-w-0 max-w-full box-border rounded-xl border border-white/10 bg-slate-800 px-4 py-3 text-white outline-none focus:border-emerald-400"



              />



              <p className="mt-2 text-xs text-slate-500">



                Pilih tarikh untuk melihat rekod bacaan peserta pada hari tersebut.



              </p>



            </div>



            {/* PESERTA */}



            <div className="mt-5">



              <label className="text-sm font-semibold text-slate-300">



                👤 Peserta



              </label>



              <select



                value={



                  selectedParticipantId



                }



                onChange={(event) =>



                  handleSelectParticipant(



                    event.target.value



                  )



                }



                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-3 text-white outline-none focus:border-emerald-400"



              >



                <option value="">



                  — Pilih peserta —



                </option>



                {participants.map(



                  (participant) => (



                    <option



                      key={



                        participant.id



                      }



                      value={



                        participant.id



                      }



                    >



                      {



                        participant.name



                      }{" "}



                      ·{" "}



                      {



                        participant.current_page



                      }



                      /604



                    </option>



                  )



                )}



              </select>



            </div>



            {selectedParticipant && (



              <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">



                <div className="flex items-center gap-4">



                  <div className="h-20 w-20 overflow-hidden rounded-2xl border border-emerald-400/20 bg-slate-800">



                    {selectedParticipant.photo_url ? (



                      <img



                        src={



                          selectedParticipant.photo_url



                        }



                        alt={



                          selectedParticipant.name



                        }



                        className="h-full w-full object-cover"



                      />



                    ) : (



                      <div className="flex h-full w-full items-center justify-center text-4xl">



                        👤



                      </div>



                    )}



                  </div>



                  <div>



                    <p className="text-sm text-slate-400">



                      Peserta dipilih



                    </p>



                    <p className="mt-1 text-xl font-black">



                      {



                        selectedParticipant.name



                      }



                    </p>



                    <p className="mt-2 text-emerald-400">



                      Kemajuan semasa:{" "}



                      {



                        selectedParticipant.current_page



                      }{" "}



                      / 604



                    </p>



                  </div>



                </div>



                {selectedParticipant.grandmaster_at && (



                  <p className="mt-4 font-bold text-yellow-400">



                    👑 GRANDMASTER



                  </p>



                )}



                <label className="mt-5 block">



                  <span className="text-sm text-slate-300">



                    Tukar gambar peserta



                  </span>



                  <input



                    type="file"



                    accept="image/jpeg,image/png,image/webp"



                    onChange={



                      handleSelectedPhotoChange



                    }



                    disabled={



                      uploadingPhoto



                    }



                    className="mt-2 block w-full text-sm text-slate-400 file:mr-4 file:rounded-xl file:border-0 file:bg-emerald-500 file:px-4 file:py-2 file:font-bold file:text-slate-950 hover:file:bg-emerald-400 disabled:opacity-50"



                  />



                  <p className="mt-2 text-xs text-slate-500">



                    {uploadingPhoto



                      ? "Sedang memampatkan dan memuat naik gambar…"



                      : "JPG, PNG atau WebP. Gambar akan dimampatkan automatik."}



                  </p>



                </label>



              </div>



            )}



          </div>



          {/* REKOD TARIKH DIPILIH */}



          <div className="rounded-3xl border border-white/10 bg-slate-900 p-5 sm:p-7">



            <p className="text-xs font-semibold text-emerald-400">



              REKOD BACAAN



            </p>



            <h3 className="mt-1 text-xl font-bold">



              📊 Bacaan Tarikh Dipilih



            </h3>



            {recordsParticipant ? (



              <>



                <p className="mt-4 text-lg font-bold">



                  {



                    recordsParticipant.name



                  }



                </p>



                <p className="mt-1 text-sm font-semibold text-blue-400">



                  📅{" "}



                  {formatSelectedDate(



                    selectedRecordDate



                  )}



                </p>



                <p className="mt-3 text-sm text-slate-500">



                  Jumlah bacaan pada tarikh dipilih



                </p>



                <p className="mt-2 text-4xl font-black text-emerald-400">



                  {selectedDatePages}



                </p>



                <p className="text-sm text-slate-400">



                  muka surat



                </p>



                <div className="mt-6 space-y-3">



                  {records.length >



                  0 ? (



                    records.map(



                      (record) => (



                        <div



                          key={



                            record.id



                          }



                          className="flex items-center justify-between rounded-xl bg-slate-800 px-4 py-3"



                        >



                          <span className="text-sm text-slate-300">



                            {



                              record.page_from



                            }



                            {" → "}



                            {



                              record.page_to



                            }



                          </span>



                          <span className="font-bold text-emerald-400">



                            +



                            {



                              record.pages_read



                            }



                          </span>



                        </div>



                      )



                    )



                  ) : (



                    <div className="rounded-xl border border-white/5 bg-slate-800/50 px-4 py-4">



                      <p className="text-sm text-slate-400">



                        Tiada rekod bacaan pada tarikh ini.



                      </p>



                    </div>



                  )}



                </div>



              </>



            ) : (



              <div className="mt-5 rounded-xl border border-white/5 bg-slate-800/50 px-4 py-4">



                <p className="text-sm text-slate-500">



                  Pilih peserta untuk melihat rekod bacaan pada tarikh yang dipilih.



                </p>



              </div>



            )}



          </div>



        </div>



      </section>



      </main>



    </>



  );



}
