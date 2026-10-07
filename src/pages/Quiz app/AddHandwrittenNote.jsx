import React, { useEffect, useState } from "react";
import HOC from "../../components/HOC/HOC";
import { GoArrowLeft } from "react-icons/go";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { FiUploadCloud, FiCheckCircle, FiX } from "react-icons/fi";
import { toast } from "sonner";
import {
  addHandwrittenNote,
  getAllEducatorNotes,
  getAllHandwrittenNotes,
  getAllSubjects,
  getAllSubjectsByGoalExam,
  getAllSubSubjects,
  getAllVideos,
  getGoalCategory,
  getGoalExamByGoalCategory,
  getTopicsByChapter,
  getStudyPlannerPlans,
  uploadHandwrittenNotesFile,
} from "../../services/exportFunctions";
import HandwrittenNotesFormComponent from "../../services/HandwrittenNotesFormComponent";

// ─────────────────────────────────────────────────────────────
// Robust URL extractor for the upload response
// Handles: string, {url}, {data: "..."}, {data: [...]}, {data: {url}},
//          {data: {files: [...]}}, Cloudinary, S3, custom backends.
// ─────────────────────────────────────────────────────────────
const extractUrl = (res) => {
  if (!res) return "";
  if (typeof res === "string") return res;

  const pick = (obj) =>
    obj?.url ||
    obj?.fileUrl ||
    obj?.file ||
    obj?.path ||
    obj?.secure_url ||
    obj?.location ||
    "";

  // Top-level keys
  const direct = pick(res);
  if (direct) return direct;

  const d = res.data;

  // ⭐ Array directly under `data` — your backend case
  if (Array.isArray(d) && d.length > 0) {
    const first = d[0];
    if (typeof first === "string") return first;
    if (first && typeof first === "object") {
      const fromObj = pick(first);
      if (fromObj) return fromObj;
    }
  }

  // Object under `data` (incl. { data: { files: [...] } })
  if (d && typeof d === "object") {
    if (Array.isArray(d.files) && d.files.length > 0) {
      const first = d.files[0];
      if (typeof first === "string") return first;
      if (first && typeof first === "object") {
        const fromObj = pick(first);
        if (fromObj) return fromObj;
      }
    }
    const fromData = pick(d);
    if (fromData) return fromData;
  }

  return "";
};

const AddHandwrittenNote = () => {
  const navigate = useNavigate();

  const { register, handleSubmit, watch, reset, setValue } = useForm({
    defaultValues: { isUsed: "true" },
  });

  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [allGoals, setAllGoals] = useState([]);
  const [isSamePage, setIsSamePage] = useState(false);
  const [handwrittennotes, setHandwrittenNotes] = useState([]);
  const [educatorNotes, setEducatorNotes] = useState([]);
  const [studyplannerStudyPlans, setStudyplannerStudyPlans] = useState([]);
  const [formSubjects, setFormSubjects] = useState([]);

  const [notesFile, setNotesFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFileUrl, setUploadedFileUrl] = useState("");

  const [subjects, setSubjects] = useState([]);
  const [subSubjects, setSubSubjects] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [topics, setTopics] = useState([]);

  // ── Initial data loads ────────────────────────────────────
  useEffect(() => {
    getStudyPlannerPlans({ setIsLoading, setData: setStudyplannerStudyPlans });
    getGoalCategory({ setIsLoading, setData });
  }, []);

  const goalCategory = watch("goalCategory");

  useEffect(() => {
    if (goalCategory) {
      const params = {
        page: 1,
        limit: 100,
        search: "",
        goalCategoryId: goalCategory,
      };
      getGoalExamByGoalCategory({ setIsLoading, setData: setAllGoals, params });
    }
  }, [goalCategory]);

  const goalExamId = watch("goal");

  useEffect(() => {
    if (goalExamId) {
      const params = {
        page: 1,
        limit: 100,
        search: "",
        goalCategory,
        goalId: goalExamId,
      };
      getAllSubjects({ setIsLoading, setData: setSubjects, params });
    }
  }, [goalExamId]);

  const subjectId = watch("subject");

  useEffect(() => {
    if (subjectId) {
      const params = { page: 1, limit: 100, search: "", subjectId };
      getAllSubSubjects({ setIsLoading, setData: setSubSubjects, params });
    }
  }, [subjectId]);

  const subSubjectId = watch("subSubject");

  useEffect(() => {
    if (subjectId || subSubjectId) {
      const params = { page: 1, limit: 100, search: "" };
      if (subjectId) params.subjectId = subjectId;
      if (subSubjectId) params.subSubjectId = subSubjectId;
      getAllSubjectsByGoalExam({ setIsLoading, setData: setChapters, params });
    }
  }, [subjectId, subSubjectId]);

  const chapterId = watch("chapter");

  useEffect(() => {
    if (chapterId) {
      const params = { page: 1, limit: 100, search: "", chapterId };
      getTopicsByChapter({ setIsLoading, setData: setTopics, params });
    }
  }, [chapterId]);

  const topicId = watch("topic");

  useEffect(() => {
    if (topicId) {
      const params = { page: 1, limit: 100, search: "", topicId };
      getAllVideos({
        setIsLoading,
        setData: (res) => console.log(res?.data?.[0]),
        params,
      });
    }
  }, [topicId]);

  useEffect(() => {
    getAllHandwrittenNotes({
      setIsLoading,
      setData: setHandwrittenNotes,
      params: { limit: 3000 },
    });
  }, []);

  useEffect(() => {
    getAllEducatorNotes({
      setIsLoading,
      setData: setEducatorNotes,
      params: { limit: 3000 },
    });
  }, []);

  // ── File change ───────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_MB = 20;
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`File too large. Max ${MAX_MB} MB allowed.`);
      e.target.value = "";
      return;
    }

    setNotesFile(file);
    setUploadedFileUrl("");
  };

  // ── File upload ───────────────────────────────────────────
  const handleFileUpload = async ({ silent = false } = {}) => {
    if (!notesFile) {
      if (!silent) toast.error("Please select a file first");
      throw new Error("No file selected");
    }

    setIsUploading(true);
    const toastId = silent ? undefined : toast.loading("Uploading file…");

    try {
      const response = await uploadHandwrittenNotesFile({
        file: notesFile,
        setIsLoading: setIsUploading,
      });

      const fileUrl = extractUrl(response);

      if (!fileUrl) {
        const msg = "Upload succeeded but no URL was returned. Check console.";
        console.warn("Unrecognized upload response shape:", response);
        if (toastId) toast.error(msg, { id: toastId });
        else if (!silent) toast.error(msg);
        throw new Error("No URL in upload response");
      }

      setUploadedFileUrl(fileUrl);
      setValue("image", fileUrl, { shouldValidate: true });

      if (toastId) toast.success("File uploaded successfully", { id: toastId });
      else if (!silent) toast.success("File uploaded successfully");

      return fileUrl;
    } catch (err) {
      console.error("Upload error:", err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "File upload failed. Please try again.";
      if (toastId) toast.error(msg, { id: toastId });
      else if (!silent) toast.error(msg);
      throw err;
    } finally {
      setIsUploading(false);
    }
  };

  // ── Submit ────────────────────────────────────────────────
  const onSubmit = async (formData) => {
    let fileUrl = uploadedFileUrl;

    // 1. Upload file if not already uploaded
    if (notesFile && !fileUrl) {
      try {
        fileUrl = await handleFileUpload();
      } catch (err) {
        return; // error toast already shown by handleFileUpload
      }
    }

    // 2. Require either uploaded file URL or a manual image URL
    if (!fileUrl && !formData.image) {
      toast.error("Please upload a notes file or provide a tile image URL.");
      return;
    }

    // 3. Require at least one subject
    if (!formSubjects || formSubjects.length === 0) {
      toast.error("Please add at least one subject before saving.");
      return;
    }

    const payload = {
      topperName: formData.topperName || "",
      bundleName: formData.bundleName,
      desc: formData.desc || "",
      pagesCount: Number(formData.pagesCount),
      price: Number(formData.price),
      duration: formData.duration,
      isUsed: formData.isUsed === "true" || formData.isUsed === true,
      goalCategory: formData.goalCategory,
      goal: formData.goal,
      image: fileUrl || formData.image,
      subjects: formSubjects,
    };

    const addFun = () => {
      reset();
      setNotesFile(null);
      setUploadedFileUrl("");
      if (!isSamePage) navigate("/quizapp/handwritten-notes");
      setIsSamePage(false);
    };

    const toastId = toast.loading("Saving handwritten note…");
    try {
      await addHandwrittenNote({ data: payload, addFun });
      toast.success("Handwritten note saved successfully", { id: toastId });
    } catch (err) {
      console.error("Save error:", err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to save handwritten note.";
      toast.error(msg, { id: toastId });
    }
  };

  // ── Render ────────────────────────────────────────────────
  return (
    // Outer element is a <div>, NOT a <form>, because the embedded
    // HandwrittenNotesFormComponent already contains its own <form>.
    <div
      className="ahw-page"
      onKeyDown={(e) => {
        // Allow Enter-to-submit from non-textarea fields
        if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") {
          e.preventDefault();
          handleSubmit(onSubmit)();
        }
      }}
    >
      <div className="dashboardcontainer">
        {/* ── Header ─────────────────────────────────────── */}
        <div className="dashboardcontainer-header ahw-header">
          <h6>Add Handwritten Note</h6>
          <p className="ahw-breadcrumb">
            <GoArrowLeft
              size={22}
              style={{ cursor: "pointer" }}
              onClick={() => navigate(-1)}
            />
            <span>Quiz App</span>
            <span className="ahw-breadcrumb-sep">/</span>
            <span className="ahw-breadcrumb-active">Add Handwritten Notes</span>
          </p>
        </div>

        <div className="studentprofile-container">
          <div className="ahw-card">
            {/* ── Section 1: Course Mapping ─────────────── */}
            <section className="ahw-section">
              <header className="ahw-section-head">
                <h3>Course Mapping</h3>
                <p>Choose the university and goal exam this bundle belongs to.</p>
              </header>

              <div className="ahw-grid ahw-grid-2">
                <div className="ahw-field">
                  <label>
                    University <span className="ahw-req">*</span>
                  </label>
                  <select {...register("goalCategory", { required: true })}>
                    <option value="">Select University</option>
                    {data?.data?.map((item) => (
                      <option key={item._id} value={item._id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="ahw-field">
                  <label>
                    Goal Exam <span className="ahw-req">*</span>
                  </label>
                  <select {...register("goal", { required: true })}>
                    <option value="">Select Goal Exam</option>
                    {allGoals?.data?.map((item) => (
                      <option key={item._id} value={item._id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {goalCategory && goalExamId && (
                <div className="ahw-embedded">
                  <HandwrittenNotesFormComponent
                    goalCategory={goalCategory}
                    goalExamId={goalExamId}
                    setFormSubjects={setFormSubjects}
                  />
                </div>
              )}
            </section>

            {/* ── Section 2: Bundle Details ─────────────── */}
            <section className="ahw-section">
              <header className="ahw-section-head">
                <h3>Bundle Details</h3>
                <p>Public information shown to students.</p>
              </header>

              <div className="ahw-grid ahw-grid-2">
                <div className="ahw-field">
                  <label>Topper's Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Ananya Sharma"
                    {...register("topperName")}
                  />
                </div>
                <div className="ahw-field">
                  <label>
                    Bundle Name <span className="ahw-req">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Complete Modern History Notes"
                    {...register("bundleName", { required: true })}
                  />
                </div>
              </div>

              <div className="ahw-grid ahw-grid-2">
                <div className="ahw-field">
                  <label>
                    Page Count <span className="ahw-req">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 120"
                    {...register("pagesCount", { required: true })}
                  />
                </div>
                <div className="ahw-field">
                  <label>Tile Image Link</label>
                  <input
                    type="text"
                    placeholder="https://… or upload below"
                    {...register("image")}
                  />
                </div>
              </div>
            </section>

            {/* ── Section 3: File Upload ────────────────── */}
            <section className="ahw-section">
              <header className="ahw-section-head">
                <h3>Notes File</h3>
                <p>PDF, DOC, DOCX, JPG or PNG. Max 1 file.</p>
              </header>

              <div className="ahw-upload-row">
                <label className="ahw-upload">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                  />
                  <FiUploadCloud size={28} />
                  <span className="ahw-upload-text">
                    {notesFile ? notesFile.name : "Click to choose a file"}
                  </span>
                  <span className="ahw-upload-hint">
                    {notesFile
                      ? `${(notesFile.size / 1024).toFixed(0)} KB`
                      : "PDF, DOC, DOCX, JPG, PNG"}
                  </span>
                </label>

                {notesFile && !uploadedFileUrl && (
                  <button
                    type="button"
                    className="ahw-btn ahw-btn-primary"
                    onClick={() => handleFileUpload().catch(() => {})}
                    disabled={isUploading}
                  >
                    {isUploading ? "Uploading…" : "Upload File"}
                  </button>
                )}

                {uploadedFileUrl && (
                  <div className="ahw-upload-success">
                    <FiCheckCircle size={18} />
                    <span>Uploaded successfully</span>
                    <button
                      type="button"
                      className="ahw-icon-btn"
                      onClick={() => {
                        setUploadedFileUrl("");
                        setNotesFile(null);
                        setValue("image", "");
                        toast("File removed", { icon: "🗑️" });
                      }}
                      aria-label="Remove file"
                    >
                      <FiX size={16} />
                    </button>
                  </div>
                )}
              </div>
            </section>

            {/* ── Section 4: Pricing & Visibility ───────── */}
            <section className="ahw-section">
              <header className="ahw-section-head">
                <h3>Pricing &amp; Visibility</h3>
                <p>Set the price, duration and listing status.</p>
              </header>

              <div className="ahw-grid ahw-grid-3">
                <div className="ahw-field">
                  <label>
                    Price (₹) <span className="ahw-req">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 499"
                    {...register("price", { required: true })}
                  />
                </div>
                <div className="ahw-field">
                  <label>
                    Duration (hr) <span className="ahw-req">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 12"
                    {...register("duration", { required: true })}
                  />
                </div>
                <div className="ahw-field">
                  <label>Show In Handwritten Notes</label>
                  <select {...register("isUsed")}>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>
              </div>

              <div className="ahw-grid ahw-grid-1">
                <div className="ahw-field">
                  <label>Description</label>
                  <textarea
                    rows={3}
                    placeholder="Short description shown to students…"
                    {...register("desc")}
                  />
                </div>
              </div>
            </section>

            {/* ── Action Bar ────────────────────────────── */}
            <div className="ahw-actions">
              <button
                type="button"
                className="ahw-btn ahw-btn-ghost"
                onClick={() => navigate(-1)}
                disabled={isUploading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ahw-btn ahw-btn-primary"
                onClick={handleSubmit(onSubmit)}
                disabled={isUploading}
              >
                {isUploading ? "Uploading…" : "Save Handwritten Note"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HOC(AddHandwrittenNote);