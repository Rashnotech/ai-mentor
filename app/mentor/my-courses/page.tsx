"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/lib/auth-context"
import { 
  courseAdminApi, 
  CourseListResponse, 
  CourseCreatePayload, 
  CourseUpdatePayload, 
  LearningPathResponse,
  LearningPathCreatePayload,
  LearningPathUpdatePayload,
  ModuleResponse,
  ModuleCreatePayload,
  ModuleUpdatePayload,
  LessonResponse,
  LessonCreatePayload,
  LessonUpdatePayload,
  ProjectResponse,
  ProjectCreatePayload,
  ProjectUpdatePayload,
  AssessmentQuestionResponse,
  AssessmentQuestionCreatePayload,
  AssessmentQuestionUpdatePayload,
  getApiErrorMessage,
  validateModuleForm,
  generateSlug,
  sanitizeString,
} from "@/lib/api"
import { toast } from "sonner"
import {
  Search,
  BookOpen,
  Clock,
  Plus,
  Loader2,
  Pencil,
  Trash2,
  XCircle,
  FolderOpen,
  Star,
  ChevronRight,
  FileText,
  Code,
  HelpCircle,
  GripVertical,
  Check,
  X,
  Save,
} from "lucide-react"

type DifficultyLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED"

export default function MyCoursesPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all")
  const [showCreateCourseModal, setShowCreateCourseModal] = useState(false)
  const [showEditCourseModal, setShowEditCourseModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [courseToDelete, setCourseToDelete] = useState<CourseListResponse | null>(null)
  const [editingCourse, setEditingCourse] = useState<CourseListResponse | null>(null)
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null)

  // Learning path management state
  const [selectedPathId, setSelectedPathId] = useState<number | null>(null)
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null)
  const [showCreatePathModal, setShowCreatePathModal] = useState(false)
  const [showEditPathModal, setShowEditPathModal] = useState(false)
  const [showDeletePathConfirm, setShowDeletePathConfirm] = useState(false)
  const [pathToDelete, setPathToDelete] = useState<LearningPathResponse | null>(null)
  const [editingPath, setEditingPath] = useState<LearningPathResponse | null>(null)
  
  // Module management state
  const [showCreateModuleModal, setShowCreateModuleModal] = useState(false)
  const [showEditModuleModal, setShowEditModuleModal] = useState(false)
  const [showDeleteModuleConfirm, setShowDeleteModuleConfirm] = useState(false)
  const [moduleToDelete, setModuleToDelete] = useState<ModuleResponse | null>(null)
  const [editingModule, setEditingModule] = useState<ModuleResponse | null>(null)
  const [selectedPathForModule, setSelectedPathForModule] = useState<number | null>(null)

  // Lesson management state
  const [showCreateLessonModal, setShowCreateLessonModal] = useState(false)
  const [showEditLessonModal, setShowEditLessonModal] = useState(false)
  const [showDeleteLessonConfirm, setShowDeleteLessonConfirm] = useState(false)
  const [lessonToDelete, setLessonToDelete] = useState<LessonResponse | null>(null)
  const [editingLesson, setEditingLesson] = useState<LessonResponse | null>(null)

  // Project management state
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false)
  const [showEditProjectModal, setShowEditProjectModal] = useState(false)
  const [showDeleteProjectConfirm, setShowDeleteProjectConfirm] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<ProjectResponse | null>(null)
  const [editingProject, setEditingProject] = useState<ProjectResponse | null>(null)

  // Assessment management state
  const [showCreateAssessmentModal, setShowCreateAssessmentModal] = useState(false)
  const [showEditAssessmentModal, setShowEditAssessmentModal] = useState(false)
  const [showDeleteAssessmentConfirm, setShowDeleteAssessmentConfirm] = useState(false)
  const [assessmentToDelete, setAssessmentToDelete] = useState<AssessmentQuestionResponse | null>(null)
  const [editingAssessment, setEditingAssessment] = useState<AssessmentQuestionResponse | null>(null)

  // Form state for creating/editing courses
  const [courseForm, setCourseForm] = useState({
    title: "",
    slug: "",
    description: "",
    estimated_hours: 10,
    difficulty_level: "BEGINNER" as DifficultyLevel,
    is_active: false,
    cover_image_url: "",
    prerequisites: "",
    what_youll_learn: "",
    certificate_on_completion: false,
  })

  // Form state for learning paths
  const [pathForm, setPathForm] = useState({
    title: "",
    description: "",
    price: 0,
    min_skill_level: "",
    max_skill_level: "",
    tags: "",
    is_default: false,
  })

  // Form state for modules
  const [moduleForm, setModuleForm] = useState({
    title: "",
    slug: "",
    description: "",
    order: 1,
    estimated_hours: 1,
    unlock_after_days: 0,
    is_available_by_default: true,
    first_deadline_days: null as number | null,
    second_deadline_days: null as number | null,
    third_deadline_days: null as number | null,
  })

  // Handle module title change with slug generation
  const handleModuleTitleChange = (title: string) => {
    setModuleForm(prev => ({
      ...prev,
      title: title,
      slug: generateSlug(title),
    }))
  }

  // Form state for lessons
  const [lessonForm, setLessonForm] = useState({
    title: "",
    description: "",
    content: "",
    order: 1,
    content_type: "text",
    estimated_minutes: 30,
    youtube_video_url: "",
    external_resources: "",
    expected_outcomes: "",
    starter_file_url: "",
    solution_file_url: "",
  })

  // Form state for projects
  const [projectForm, setProjectForm] = useState({
    title: "",
    description: "",
    order: 1,
    estimated_hours: 2,
    starter_repo_url: "",
    solution_repo_url: "",
    required_skills: "",
  })

  // Form state for assessments
  const [assessmentForm, setAssessmentForm] = useState({
    question_text: "",
    question_type: "multiple_choice" as "multiple_choice" | "debugging" | "coding" | "short_answer",
    difficulty_level: "BEGINNER" as DifficultyLevel,
    order: 1,
    options: "",
    correct_answer: "",
    explanation: "",
    points: 10,
  })

  // Fetch courses created by this mentor only
  const {
    data: courses = [],
    isLoading: isLoadingCourses,
    isError: isCoursesError,
    error: coursesError,
    refetch: refetchCourses,
  } = useQuery({
    queryKey: ["mentor", "courses", statusFilter, searchQuery, user?.id],
    queryFn: () =>
      courseAdminApi.listCourses({
        status: statusFilter === "all" ? undefined : statusFilter,
        search: searchQuery || undefined,
        created_by: user?.id,
      }),
    enabled: !!user?.id,
    staleTime: 30000,
  })

  // Fetch learning paths for selected course
  const {
    data: learningPaths = [],
    isLoading: isLoadingPaths,
  } = useQuery({
    queryKey: ["mentor", "learningPaths", selectedCourse],
    queryFn: () => selectedCourse ? courseAdminApi.listLearningPaths(selectedCourse) : Promise.resolve([]),
    enabled: !!selectedCourse,
    staleTime: 30000,
  })

  // Fetch modules for selected path
  const {
    data: modules = [],
    isLoading: isLoadingModules,
  } = useQuery({
    queryKey: ["mentor", "modules", selectedPathId],
    queryFn: () => selectedPathId ? courseAdminApi.listModules(selectedPathId) : Promise.resolve([]),
    enabled: !!selectedPathId,
    staleTime: 30000,
  })

  // Fetch lessons for selected module
  const {
    data: lessons = [],
    isLoading: isLoadingLessons,
  } = useQuery({
    queryKey: ["mentor", "lessons", selectedModuleId],
    queryFn: () => selectedModuleId ? courseAdminApi.listLessons(selectedModuleId) : Promise.resolve([]),
    enabled: !!selectedModuleId,
    staleTime: 30000,
  })

  // Fetch projects for selected module
  const {
    data: projects = [],
    isLoading: isLoadingProjects,
  } = useQuery({
    queryKey: ["mentor", "projects", selectedModuleId],
    queryFn: () => selectedModuleId ? courseAdminApi.listProjects(selectedModuleId) : Promise.resolve([]),
    enabled: !!selectedModuleId,
    staleTime: 30000,
  })

  // Fetch assessments for selected module
  const {
    data: assessments = [],
    isLoading: isLoadingAssessments,
  } = useQuery({
    queryKey: ["mentor", "assessments", selectedModuleId],
    queryFn: () => selectedModuleId ? courseAdminApi.listAssessments(selectedModuleId) : Promise.resolve([]),
    enabled: !!selectedModuleId,
    staleTime: 30000,
  })

  // Create course mutation
  const createCourseMutation = useMutation({
    mutationFn: (data: CourseCreatePayload) => courseAdminApi.createCourse(data),
    onSuccess: (newCourse) => {
      queryClient.invalidateQueries({ queryKey: ["mentor", "courses"] })
      toast.success("Course created successfully!", {
        description: `"${newCourse.title}" has been created.`,
      })
      setShowCreateCourseModal(false)
      resetCourseForm()
    },
    onError: (error) => {
      toast.error("Failed to create course", {
        description: getApiErrorMessage(error),
      })
    },
  })

  // Update course mutation
  const updateCourseMutation = useMutation({
    mutationFn: ({ courseId, data }: { courseId: number; data: CourseUpdatePayload }) =>
      courseAdminApi.updateCourse(courseId, data),
    onSuccess: (updatedCourse) => {
      queryClient.invalidateQueries({ queryKey: ["mentor", "courses"] })
      toast.success("Course updated successfully!", {
        description: `"${updatedCourse.title}" has been updated.`,
      })
      setShowEditCourseModal(false)
      setEditingCourse(null)
      resetCourseForm()
    },
    onError: (error) => {
      toast.error("Failed to update course", {
        description: getApiErrorMessage(error),
      })
    },
  })

  // Delete course mutation
  const deleteCourseMutation = useMutation({
    mutationFn: (courseId: number) => courseAdminApi.deleteCourse(courseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentor", "courses"] })
      toast.success("Course deleted successfully!")
      setShowDeleteConfirm(false)
      setCourseToDelete(null)
      if (selectedCourse === courseToDelete?.course_id) {
        setSelectedCourse(null)
      }
    },
    onError: (error) => {
      toast.error("Failed to delete course", {
        description: getApiErrorMessage(error),
      })
    },
  })

  // Learning Path mutations
  const createPathMutation = useMutation({
    mutationFn: (data: LearningPathCreatePayload) => courseAdminApi.createLearningPath(selectedCourse!, data),
    onSuccess: (newPath) => {
      queryClient.invalidateQueries({ queryKey: ["mentor", "learningPaths", selectedCourse] })
      toast.success("Learning path created!", { description: `"${newPath.title}" has been created.` })
      setShowCreatePathModal(false)
      resetPathForm()
    },
    onError: (error) => toast.error("Failed to create path", { description: getApiErrorMessage(error) }),
  })

  const updatePathMutation = useMutation({
    mutationFn: ({ pathId, data }: { pathId: number; data: LearningPathUpdatePayload }) =>
      courseAdminApi.updateLearningPath(pathId, data),
    onSuccess: (updatedPath) => {
      queryClient.invalidateQueries({ queryKey: ["mentor", "learningPaths", selectedCourse] })
      toast.success("Learning path updated!", { description: `"${updatedPath.title}" has been updated.` })
      setShowEditPathModal(false)
      setEditingPath(null)
      resetPathForm()
    },
    onError: (error) => toast.error("Failed to update path", { description: getApiErrorMessage(error) }),
  })

  const deletePathMutation = useMutation({
    mutationFn: (pathId: number) => courseAdminApi.deleteLearningPath(pathId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentor", "learningPaths", selectedCourse] })
      toast.success("Learning path deleted!")
      setShowDeletePathConfirm(false)
      setPathToDelete(null)
      if (selectedPathId === pathToDelete?.path_id) {
        setSelectedPathId(null)
        setSelectedModuleId(null)
      }
    },
    onError: (error) => toast.error("Failed to delete path", { description: getApiErrorMessage(error) }),
  })

  const setDefaultPathMutation = useMutation({
    mutationFn: (pathId: number) => courseAdminApi.setDefaultPath(selectedCourse!, pathId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentor", "learningPaths", selectedCourse] })
      toast.success("Default path set!")
    },
    onError: (error) => toast.error("Failed to set default", { description: getApiErrorMessage(error) }),
  })

  const unsetDefaultPathMutation = useMutation({
    mutationFn: (pathId: number) => courseAdminApi.unsetDefaultPath(selectedCourse!, pathId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentor", "learningPaths", selectedCourse] })
      toast.success("Default path removed!")
    },
    onError: (error) => toast.error("Failed to unset default", { description: getApiErrorMessage(error) }),
  })

  // Module mutations
  const createModuleMutation = useMutation({
    mutationFn: (data: ModuleCreatePayload) => courseAdminApi.createModule(data.path_id, data),
    onSuccess: (newModule) => {
      queryClient.invalidateQueries({ queryKey: ["mentor", "learningPaths", selectedCourse] })
      queryClient.invalidateQueries({ queryKey: ["mentor", "modules"] })
      queryClient.invalidateQueries({ queryKey: ["mentor", "courses"] })
      toast.success("Module created!", { description: `"${newModule.title}" has been created.` })
      setShowCreateModuleModal(false)
      setModuleForm({ title: "", slug: "", description: "", order: 1, estimated_hours: 1, unlock_after_days: 0, is_available_by_default: true, first_deadline_days: null, second_deadline_days: null, third_deadline_days: null })
      setSelectedPathForModule(null)
    },
    onError: (error) => toast.error("Failed to create module", { description: getApiErrorMessage(error) }),
  })

  const updateModuleMutation = useMutation({
    mutationFn: ({ moduleId, data }: { moduleId: number; data: ModuleUpdatePayload }) =>
      courseAdminApi.updateModule(moduleId, data),
    onSuccess: (updatedModule) => {
      queryClient.invalidateQueries({ queryKey: ["mentor", "modules", selectedPathId] })
      toast.success("Module updated!", { description: `"${updatedModule.title}" has been updated.` })
      setShowEditModuleModal(false)
      setEditingModule(null)
      setModuleForm({ title: "", slug: "", description: "", order: 1, estimated_hours: 1, unlock_after_days: 0, is_available_by_default: true, first_deadline_days: null, second_deadline_days: null, third_deadline_days: null })
    },
    onError: (error) => toast.error("Failed to update module", { description: getApiErrorMessage(error) }),
  })

  const deleteModuleMutation = useMutation({
    mutationFn: (moduleId: number) => courseAdminApi.deleteModule(moduleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentor", "modules", selectedPathId] })
      toast.success("Module deleted!")
      setShowDeleteModuleConfirm(false)
      setModuleToDelete(null)
      if (selectedModuleId === moduleToDelete?.module_id) {
        setSelectedModuleId(null)
      }
    },
    onError: (error) => toast.error("Failed to delete module", { description: getApiErrorMessage(error) }),
  })

  // Lesson mutations
  const createLessonMutation = useMutation({
    mutationFn: (data: LessonCreatePayload) => courseAdminApi.createLesson(selectedModuleId!, data),
    onSuccess: (newLesson) => {
      queryClient.invalidateQueries({ queryKey: ["mentor", "lessons", selectedModuleId] })
      toast.success("Lesson created!", { description: `"${newLesson.title}" has been created.` })
      setShowCreateLessonModal(false)
      resetLessonForm()
    },
    onError: (error) => toast.error("Failed to create lesson", { description: getApiErrorMessage(error) }),
  })

  const updateLessonMutation = useMutation({
    mutationFn: ({ lessonId, data }: { lessonId: number; data: LessonUpdatePayload }) =>
      courseAdminApi.updateLesson(lessonId, data),
    onSuccess: (updatedLesson) => {
      queryClient.invalidateQueries({ queryKey: ["mentor", "lessons", selectedModuleId] })
      toast.success("Lesson updated!", { description: `"${updatedLesson.title}" has been updated.` })
      setShowEditLessonModal(false)
      setEditingLesson(null)
      resetLessonForm()
    },
    onError: (error) => toast.error("Failed to update lesson", { description: getApiErrorMessage(error) }),
  })

  const deleteLessonMutation = useMutation({
    mutationFn: (lessonId: number) => courseAdminApi.deleteLesson(lessonId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentor", "lessons", selectedModuleId] })
      toast.success("Lesson deleted!")
      setShowDeleteLessonConfirm(false)
      setLessonToDelete(null)
    },
    onError: (error) => toast.error("Failed to delete lesson", { description: getApiErrorMessage(error) }),
  })

  // Project mutations
  const createProjectMutation = useMutation({
    mutationFn: (data: ProjectCreatePayload) => courseAdminApi.createProject(selectedModuleId!, data),
    onSuccess: (newProject) => {
      queryClient.invalidateQueries({ queryKey: ["mentor", "projects", selectedModuleId] })
      toast.success("Project created!", { description: `"${newProject.title}" has been created.` })
      setShowCreateProjectModal(false)
      resetProjectForm()
    },
    onError: (error) => toast.error("Failed to create project", { description: getApiErrorMessage(error) }),
  })

  const updateProjectMutation = useMutation({
    mutationFn: ({ projectId, data }: { projectId: number; data: ProjectUpdatePayload }) =>
      courseAdminApi.updateProject(projectId, data),
    onSuccess: (updatedProject) => {
      queryClient.invalidateQueries({ queryKey: ["mentor", "projects", selectedModuleId] })
      toast.success("Project updated!", { description: `"${updatedProject.title}" has been updated.` })
      setShowEditProjectModal(false)
      setEditingProject(null)
      resetProjectForm()
    },
    onError: (error) => toast.error("Failed to update project", { description: getApiErrorMessage(error) }),
  })

  const deleteProjectMutation = useMutation({
    mutationFn: (projectId: number) => courseAdminApi.deleteProject(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentor", "projects", selectedModuleId] })
      toast.success("Project deleted!")
      setShowDeleteProjectConfirm(false)
      setProjectToDelete(null)
    },
    onError: (error) => toast.error("Failed to delete project", { description: getApiErrorMessage(error) }),
  })

  // Assessment mutations
  const createAssessmentMutation = useMutation({
    mutationFn: (data: AssessmentQuestionCreatePayload) => courseAdminApi.createAssessmentQuestion(selectedModuleId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentor", "assessments", selectedModuleId] })
      toast.success("Assessment question created!")
      setShowCreateAssessmentModal(false)
      resetAssessmentForm()
    },
    onError: (error) => toast.error("Failed to create assessment", { description: getApiErrorMessage(error) }),
  })

  const updateAssessmentMutation = useMutation({
    mutationFn: ({ questionId, data }: { questionId: number; data: AssessmentQuestionUpdatePayload }) =>
      courseAdminApi.updateAssessmentQuestion(questionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentor", "assessments", selectedModuleId] })
      toast.success("Assessment question updated!")
      setShowEditAssessmentModal(false)
      setEditingAssessment(null)
      resetAssessmentForm()
    },
    onError: (error) => toast.error("Failed to update assessment", { description: getApiErrorMessage(error) }),
  })

  const deleteAssessmentMutation = useMutation({
    mutationFn: (questionId: number) => courseAdminApi.deleteAssessmentQuestion(questionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentor", "assessments", selectedModuleId] })
      toast.success("Assessment question deleted!")
      setShowDeleteAssessmentConfirm(false)
      setAssessmentToDelete(null)
    },
    onError: (error) => toast.error("Failed to delete assessment", { description: getApiErrorMessage(error) }),
  })

  const resetCourseForm = () => {
    setCourseForm({
      title: "",
      slug: "",
      description: "",
      estimated_hours: 10,
      difficulty_level: "BEGINNER",
      is_active: false,
      cover_image_url: "",
      prerequisites: "",
      what_youll_learn: "",
      certificate_on_completion: false,
    })
  }

  const handleCreateCourse = () => {
    const payload: CourseCreatePayload = {
      title: courseForm.title,
      slug: courseForm.slug || courseForm.title.toLowerCase().replace(/\s+/g, "-"),
      description: courseForm.description,
      estimated_hours: courseForm.estimated_hours,
      difficulty_level: courseForm.difficulty_level,
      cover_image_url: courseForm.cover_image_url || undefined,
      prerequisites: courseForm.prerequisites ? courseForm.prerequisites.split("\n").filter(Boolean) : [],
      what_youll_learn: courseForm.what_youll_learn ? courseForm.what_youll_learn.split("\n").filter(Boolean) : [],
      certificate_on_completion: courseForm.certificate_on_completion,
    }
    createCourseMutation.mutate(payload)
  }

  const handleUpdateCourse = () => {
    if (!editingCourse) return
    const payload: CourseUpdatePayload = {
      title: courseForm.title,
      slug: courseForm.slug,
      description: courseForm.description,
      estimated_hours: courseForm.estimated_hours,
      difficulty_level: courseForm.difficulty_level,
      is_active: courseForm.is_active,
      cover_image_url: courseForm.cover_image_url || undefined,
      prerequisites: courseForm.prerequisites ? courseForm.prerequisites.split("\n").filter(Boolean) : [],
      what_youll_learn: courseForm.what_youll_learn ? courseForm.what_youll_learn.split("\n").filter(Boolean) : [],
      certificate_on_completion: courseForm.certificate_on_completion,
    }
    updateCourseMutation.mutate({ courseId: editingCourse.course_id, data: payload })
  }

  const openEditCourseModal = (course: CourseListResponse) => {
    setEditingCourse(course)
    setCourseForm({
      title: course.title,
      slug: course.slug,
      description: course.description,
      estimated_hours: course.estimated_hours,
      difficulty_level: course.difficulty_level as DifficultyLevel,
      is_active: course.is_active,
      cover_image_url: "",
      prerequisites: (course.prerequisites || []).join("\n"),
      what_youll_learn: (course.what_youll_learn || []).join("\n"),
      certificate_on_completion: course.certificate_on_completion || false,
    })
    setShowEditCourseModal(true)
  }

  // Reset form functions
  const resetPathForm = () => {
    setPathForm({ title: "", description: "", price: 0, min_skill_level: "", max_skill_level: "", tags: "", is_default: false })
  }

  const resetModuleForm = () => {
    setModuleForm({ title: "", slug: "", description: "", order: modules.length + 1, estimated_hours: 1, unlock_after_days: 0, is_available_by_default: true, first_deadline_days: null, second_deadline_days: null, third_deadline_days: null })
  }

  const resetLessonForm = () => {
    setLessonForm({ title: "", description: "", content: "", order: lessons.length + 1, content_type: "text", estimated_minutes: 30, youtube_video_url: "", external_resources: "", expected_outcomes: "", starter_file_url: "", solution_file_url: "" })
  }

  const resetProjectForm = () => {
    setProjectForm({ title: "", description: "", order: projects.length + 1, estimated_hours: 2, starter_repo_url: "", solution_repo_url: "", required_skills: "" })
  }

  const resetAssessmentForm = () => {
    setAssessmentForm({ question_text: "", question_type: "multiple_choice", difficulty_level: "BEGINNER", order: assessments.length + 1, options: "", correct_answer: "", explanation: "", points: 10 })
  }

  // Path handlers
  const handleCreatePath = () => {
    if (!selectedCourse) return
    const payload: LearningPathCreatePayload = {
      course_id: selectedCourse,
      title: pathForm.title,
      description: pathForm.description,
      price: pathForm.price,
      min_skill_level: pathForm.min_skill_level || undefined,
      max_skill_level: pathForm.max_skill_level || undefined,
      tags: pathForm.tags ? pathForm.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
      is_default: pathForm.is_default,
    }
    createPathMutation.mutate(payload)
  }

  const handleUpdatePath = () => {
    if (!editingPath) return
    const payload: LearningPathUpdatePayload = {
      title: pathForm.title,
      description: pathForm.description,
      price: pathForm.price,
      min_skill_level: pathForm.min_skill_level || undefined,
      max_skill_level: pathForm.max_skill_level || undefined,
      tags: pathForm.tags ? pathForm.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
      is_default: pathForm.is_default,
    }
    updatePathMutation.mutate({ pathId: editingPath.path_id, data: payload })
  }

  const openEditPathModal = (path: LearningPathResponse) => {
    setEditingPath(path)
    setPathForm({
      title: path.title,
      description: path.description,
      price: path.price,
      min_skill_level: path.min_skill_level || "",
      max_skill_level: path.max_skill_level || "",
      tags: path.tags.join(", "),
      is_default: path.is_default,
    })
    setShowEditPathModal(true)
  }

  // Module handlers
  const handleCreateModule = async () => {
    // Validate module form
    const errors = validateModuleForm({
      title: moduleForm.title,
      description: moduleForm.description,
      order: moduleForm.order,
      first_deadline_days: moduleForm.first_deadline_days ?? undefined,
      second_deadline_days: moduleForm.second_deadline_days ?? undefined,
      third_deadline_days: moduleForm.third_deadline_days ?? undefined,
    })
    if (Object.keys(errors).length > 0) {
      toast.error("Please fill in all required fields")
      return
    }

    if (!selectedCourse) {
      toast.error("Please select a course first")
      return
    }

    try {
      let pathId: number

      // Check if a specific path is selected from dropdown
      if (selectedPathForModule) {
        pathId = selectedPathForModule
      } else if (learningPaths.length === 0) {
        // Auto-create a default learning path for this course
        toast.info("Creating default learning path...")
        const selectedCourseData = courses.find(c => c.course_id === selectedCourse)
        const defaultPath = await courseAdminApi.createLearningPath(selectedCourse, {
          course_id: selectedCourse,
          title: `${selectedCourseData?.title || 'Course'} - Main Path`,
          description: `Default learning path for ${selectedCourseData?.title || 'this course'}`,
          is_default: true,
        })
        pathId = defaultPath.path_id
        // Invalidate to refresh learning paths
        queryClient.invalidateQueries({ queryKey: ["mentor", "learningPaths", selectedCourse] })
      } else {
        // Use the first (or default) learning path
        const defaultPath = learningPaths.find(p => p.is_default) || learningPaths[0]
        pathId = defaultPath.path_id
      }

      const payload: ModuleCreatePayload = {
        path_id: pathId,
        title: sanitizeString(moduleForm.title),
        description: sanitizeString(moduleForm.description),
        order: moduleForm.order,
        unlock_after_days: moduleForm.unlock_after_days,
        is_available_by_default: moduleForm.is_available_by_default,
        first_deadline_days: moduleForm.first_deadline_days || undefined,
        second_deadline_days: moduleForm.second_deadline_days || undefined,
        third_deadline_days: moduleForm.third_deadline_days || undefined,
      }
      createModuleMutation.mutate(payload)
    } catch (error) {
      toast.error("Failed to create module", {
        description: getApiErrorMessage(error),
      })
    }
  }

  const handleUpdateModule = () => {
    if (!editingModule) return
    const payload: ModuleUpdatePayload = {
      title: sanitizeString(moduleForm.title),
      description: sanitizeString(moduleForm.description),
      order: moduleForm.order,
      estimated_hours: editingModule.estimated_hours || 0,
      unlock_after_days: moduleForm.unlock_after_days,
      is_available_by_default: moduleForm.is_available_by_default,
      first_deadline_days: moduleForm.first_deadline_days || undefined,
      second_deadline_days: moduleForm.second_deadline_days || undefined,
      third_deadline_days: moduleForm.third_deadline_days || undefined,
    }
    updateModuleMutation.mutate({ moduleId: editingModule.module_id, data: payload })
  }

  const openEditModuleModal = (module: ModuleResponse) => {
    setEditingModule(module)
    setModuleForm({
      title: module.title,
      slug: "",
      description: module.description,
      order: module.order,
      estimated_hours: module.estimated_hours || 1,
      unlock_after_days: module.unlock_after_days,
      is_available_by_default: module.is_available_by_default,
      first_deadline_days: module.first_deadline_days ?? null,
      second_deadline_days: module.second_deadline_days ?? null,
      third_deadline_days: module.third_deadline_days ?? null,
    })
    setShowEditModuleModal(true)
  }

  // Lesson handlers
  const handleCreateLesson = () => {
    if (!selectedModuleId) return
    const payload: LessonCreatePayload = {
      module_id: selectedModuleId,
      title: lessonForm.title,
      description: lessonForm.description,
      content: lessonForm.content || undefined,
      order: lessonForm.order,
      content_type: lessonForm.content_type || undefined,
      estimated_minutes: lessonForm.estimated_minutes,
      youtube_video_url: lessonForm.youtube_video_url || undefined,
      external_resources: lessonForm.external_resources ? lessonForm.external_resources.split("\n").filter(Boolean) : [],
      expected_outcomes: lessonForm.expected_outcomes ? lessonForm.expected_outcomes.split("\n").filter(Boolean) : [],
      starter_file_url: lessonForm.starter_file_url || undefined,
      solution_file_url: lessonForm.solution_file_url || undefined,
    }
    createLessonMutation.mutate(payload)
  }

  const handleUpdateLesson = () => {
    if (!editingLesson) return
    const payload: LessonUpdatePayload = {
      title: lessonForm.title,
      description: lessonForm.description,
      content: lessonForm.content || undefined,
      order: lessonForm.order,
      content_type: lessonForm.content_type || undefined,
      estimated_minutes: lessonForm.estimated_minutes,
      youtube_video_url: lessonForm.youtube_video_url || undefined,
      external_resources: lessonForm.external_resources ? lessonForm.external_resources.split("\n").filter(Boolean) : [],
      expected_outcomes: lessonForm.expected_outcomes ? lessonForm.expected_outcomes.split("\n").filter(Boolean) : [],
      starter_file_url: lessonForm.starter_file_url || undefined,
      solution_file_url: lessonForm.solution_file_url || undefined,
    }
    updateLessonMutation.mutate({ lessonId: editingLesson.lesson_id, data: payload })
  }

  const openEditLessonModal = (lesson: LessonResponse) => {
    setEditingLesson(lesson)
    setLessonForm({
      title: lesson.title,
      description: lesson.description,
      content: lesson.content || "",
      order: lesson.order,
      content_type: lesson.content_type || "text",
      estimated_minutes: lesson.estimated_minutes || 30,
      youtube_video_url: lesson.youtube_video_url || "",
      external_resources: lesson.external_resources.join("\n"),
      expected_outcomes: lesson.expected_outcomes.join("\n"),
      starter_file_url: lesson.starter_file_url || "",
      solution_file_url: lesson.solution_file_url || "",
    })
    setShowEditLessonModal(true)
  }

  // Project handlers
  const handleCreateProject = () => {
    if (!selectedModuleId) return
    const payload: ProjectCreatePayload = {
      module_id: selectedModuleId,
      title: projectForm.title,
      description: projectForm.description,
      order: projectForm.order,
      estimated_hours: projectForm.estimated_hours,
      starter_repo_url: projectForm.starter_repo_url || undefined,
      solution_repo_url: projectForm.solution_repo_url || undefined,
      required_skills: projectForm.required_skills ? projectForm.required_skills.split(",").map(s => s.trim()).filter(Boolean) : [],
    }
    createProjectMutation.mutate(payload)
  }

  const handleUpdateProject = () => {
    if (!editingProject) return
    const payload: ProjectUpdatePayload = {
      title: projectForm.title,
      description: projectForm.description,
      order: projectForm.order,
      estimated_hours: projectForm.estimated_hours,
      starter_repo_url: projectForm.starter_repo_url || undefined,
      solution_repo_url: projectForm.solution_repo_url || undefined,
      required_skills: projectForm.required_skills ? projectForm.required_skills.split(",").map(s => s.trim()).filter(Boolean) : [],
    }
    updateProjectMutation.mutate({ projectId: editingProject.project_id, data: payload })
  }

  const openEditProjectModal = (project: ProjectResponse) => {
    setEditingProject(project)
    setProjectForm({
      title: project.title,
      description: project.description,
      order: project.order,
      estimated_hours: project.estimated_hours || 2,
      starter_repo_url: project.starter_repo_url || "",
      solution_repo_url: project.solution_repo_url || "",
      required_skills: project.required_skills.join(", "),
    })
    setShowEditProjectModal(true)
  }

  // Assessment handlers
  const handleCreateAssessment = () => {
    if (!selectedModuleId) return
    const payload: AssessmentQuestionCreatePayload = {
      module_id: selectedModuleId,
      question_text: assessmentForm.question_text,
      question_type: assessmentForm.question_type,
      difficulty_level: assessmentForm.difficulty_level,
      order: assessmentForm.order,
      options: assessmentForm.options ? assessmentForm.options.split("\n").filter(Boolean) : [],
      correct_answer: assessmentForm.correct_answer,
      explanation: assessmentForm.explanation || undefined,
      points: assessmentForm.points,
    }
    createAssessmentMutation.mutate(payload)
  }

  const handleUpdateAssessment = () => {
    if (!editingAssessment) return
    const payload: AssessmentQuestionUpdatePayload = {
      question_text: assessmentForm.question_text,
      question_type: assessmentForm.question_type,
      difficulty_level: assessmentForm.difficulty_level,
      order: assessmentForm.order,
      options: assessmentForm.options ? assessmentForm.options.split("\n").filter(Boolean) : [],
      correct_answer: assessmentForm.correct_answer,
      explanation: assessmentForm.explanation || undefined,
      points: assessmentForm.points,
    }
    updateAssessmentMutation.mutate({ questionId: editingAssessment.question_id, data: payload })
  }

  const openEditAssessmentModal = (assessment: AssessmentQuestionResponse) => {
    setEditingAssessment(assessment)
    setAssessmentForm({
      question_text: assessment.question_text,
      question_type: assessment.question_type as "multiple_choice" | "debugging" | "coding" | "short_answer",
      difficulty_level: assessment.difficulty_level as DifficultyLevel,
      order: assessment.order,
      options: assessment.options?.join("\n") || "",
      correct_answer: assessment.correct_answer,
      explanation: assessment.explanation || "",
      points: assessment.points || 10,
    })
    setShowEditAssessmentModal(true)
  }

  const filteredCourses = courses.filter((course) => {
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase()
      return (
        course.title.toLowerCase().includes(searchLower) ||
        course.description.toLowerCase().includes(searchLower)
      )
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Courses</h1>
          <p className="text-gray-500 mt-1">Manage courses you've created</p>
        </div>
        <Button onClick={() => setShowCreateCourseModal(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Create Course
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value: "all" | "active" | "inactive") => setStatusFilter(value)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Draft</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Courses List */}
      {isLoadingCourses ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-500">Loading courses...</span>
        </div>
      ) : isCoursesError ? (
        <Card>
          <CardContent className="p-6 text-center">
            <XCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <p className="text-red-600 font-medium">Failed to load courses</p>
            <p className="text-gray-500 text-sm mt-1">{getApiErrorMessage(coursesError)}</p>
            <Button variant="outline" onClick={() => refetchCourses()} className="mt-4">
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : filteredCourses.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No courses yet</h3>
            <p className="text-gray-500 mb-4">
              {searchQuery
                ? "No courses match your search."
                : "Create your first course to get started."}
            </p>
            {!searchQuery && (
              <Button onClick={() => setShowCreateCourseModal(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Create Course
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredCourses.map((course) => (
            <Card
              key={course.course_id}
              className={`transition-all hover:shadow-md cursor-pointer ${
                selectedCourse === course.course_id ? "ring-2 ring-blue-500" : ""
              }`}
              onClick={() => setSelectedCourse(selectedCourse === course.course_id ? null : course.course_id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 truncate">{course.title}</h3>
                      <Badge variant={course.is_active ? "default" : "secondary"}>
                        {course.is_active ? "Active" : "Draft"}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 line-clamp-2 mb-2">{course.description}</p>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <FolderOpen className="w-4 h-4" />
                        {course.paths_count || 0} paths
                      </span>
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-4 h-4" />
                        {course.modules_count || 0} modules
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {course.estimated_hours}h
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {course.difficulty_level}
                      </Badge>
                    </div>
                    {selectedCourse !== course.course_id && (
                      <p className="text-xs text-blue-600 mt-2 flex items-center gap-1">
                        <ChevronRight className="w-3 h-3" /> Click to manage content
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditCourseModal(course)}
                      className="h-8 w-8"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setCourseToDelete(course)
                        setShowDeleteConfirm(true)
                      }}
                      className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Learning Paths Section - 3 Column Layout */}
      {selectedCourse && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Manage Content: {courses.find(c => c.course_id === selectedCourse)?.title}
              </h2>
              <p className="text-sm text-gray-500">Create learning paths, modules, lessons, projects, and assessments</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setSelectedCourse(null)}>
              Close
            </Button>
          </div>
          <div className="overflow-x-auto pb-2">
            <div className="grid grid-cols-3 gap-6 min-w-[900px]">
              {/* Column 1: Learning Paths */}
              <Card>
                <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Learning Paths</CardTitle>
                  <Button size="sm" onClick={() => { resetPathForm(); setShowCreatePathModal(true); }} className="gap-1">
                    <Plus className="w-3 h-3" /> Add Path
                  </Button>
                </div>
                <CardDescription>Create different learning paths for your course</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingPaths ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              ) : learningPaths.length === 0 ? (
                <div className="text-center py-8">
                  <FolderOpen className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No learning paths yet</p>
                  <Button variant="outline" size="sm" onClick={() => { resetPathForm(); setShowCreatePathModal(true); }} className="mt-3">
                    Create First Path
                  </Button>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2 pr-3">
                    {learningPaths.map((path) => (
                      <div
                        key={path.path_id}
                        onClick={() => { setSelectedPathId(path.path_id); setSelectedModuleId(null); }}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          selectedPathId === path.path_id
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex flex-col gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="font-medium text-sm">{path.title}</span>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  <p>{path.title}</p>
                                </TooltipContent>
                              </Tooltip>
                              {path.is_default && (
                                <Badge variant="secondary" className="text-xs shrink-0">
                                  <Star className="w-3 h-3 mr-1" /> Default
                                </Badge>
                              )}
                            </div>
                            {path.description && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{path.description}</p>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="max-w-[300px]">
                                  <p className="text-wrap">{path.description}</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                            {path.min_skill_level && (
                              <Badge variant="outline" className="text-xs mt-1">{path.min_skill_level}</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1 border-t pt-2" onClick={(e) => e.stopPropagation()}>
                            {!path.is_default ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => setDefaultPathMutation.mutate(path.path_id)}
                                title="Set as default"
                              >
                                <Star className="w-3 h-3" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-yellow-500"
                                onClick={() => unsetDefaultPathMutation.mutate(path.path_id)}
                                title="Remove default"
                              >
                                <Star className="w-3 h-3 fill-current" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditPathModal(path)}>
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                              onClick={() => { setPathToDelete(path); setShowDeletePathConfirm(true); }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Column 2: Modules */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Modules</CardTitle>
                <Button
                  size="sm"
                  disabled={!selectedPathId}
                  onClick={() => { resetModuleForm(); setShowCreateModuleModal(true); }}
                  className="gap-1"
                >
                  <Plus className="w-3 h-3" /> Add Module
                </Button>
              </div>
              <CardDescription>
                {selectedPathId
                  ? `Modules for "${learningPaths.find(p => p.path_id === selectedPathId)?.title}"`
                  : "Select a learning path to manage modules"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedPathId ? (
                <div className="text-center py-8">
                  <ChevronRight className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Select a path first</p>
                </div>
              ) : isLoadingModules ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              ) : modules.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No modules yet</p>
                  <Button variant="outline" size="sm" onClick={() => { resetModuleForm(); setShowCreateModuleModal(true); }} className="mt-3">
                    Create First Module
                  </Button>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2 pr-3">
                    {modules.sort((a, b) => a.order - b.order).map((module) => (
                      <div
                        key={module.module_id}
                        onClick={() => setSelectedModuleId(module.module_id)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          selectedModuleId === module.module_id
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <div className="flex items-center gap-2">
                              <GripVertical className="w-4 h-4 text-gray-400 shrink-0" />
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="font-medium text-sm truncate block max-w-[120px]">{module.title}</span>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  <p>{module.title}</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            {module.description && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <p className="text-xs text-gray-500 mt-1 truncate max-w-[150px]">{module.description}</p>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="max-w-[300px]">
                                  <p className="text-wrap">{module.description}</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                            <div className="flex gap-2 mt-1 flex-wrap">
                              <Badge variant="outline" className="text-xs">Order: {module.order}</Badge>
                              {module.estimated_hours && (
                                <Badge variant="outline" className="text-xs">{module.estimated_hours}h</Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditModuleModal(module)}>
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                              onClick={() => { setModuleToDelete(module); setShowDeleteModuleConfirm(true); }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Column 3: Module Content (Lessons, Projects, Assessments) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Module Content</CardTitle>
              <CardDescription>
                {selectedModuleId
                  ? `Content for "${modules.find(m => m.module_id === selectedModuleId)?.title}"`
                  : "Select a module to manage content"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedModuleId ? (
                <div className="text-center py-8">
                  <ChevronRight className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Select a module first</p>
                </div>
              ) : (
                <Tabs defaultValue="lessons" className="w-full">
                  <TabsList className="w-full grid grid-cols-3">
                    <TabsTrigger value="lessons" className="text-xs">
                      <FileText className="w-3 h-3 mr-1" /> Lessons
                    </TabsTrigger>
                    <TabsTrigger value="projects" className="text-xs">
                      <Code className="w-3 h-3 mr-1" /> Projects
                    </TabsTrigger>
                    <TabsTrigger value="assessments" className="text-xs">
                      <HelpCircle className="w-3 h-3 mr-1" /> Quiz
                    </TabsTrigger>
                  </TabsList>

                  {/* Lessons Tab */}
                  <TabsContent value="lessons" className="mt-3">
                    <div className="flex justify-end mb-3">
                      <Button size="sm" onClick={() => { resetLessonForm(); setShowCreateLessonModal(true); }} className="gap-1">
                        <Plus className="w-3 h-3" /> Add Lesson
                      </Button>
                    </div>
                    {isLoadingLessons ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                      </div>
                    ) : lessons.length === 0 ? (
                      <div className="text-center py-6">
                        <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-xs text-gray-500">No lessons yet</p>
                      </div>
                    ) : (
                      <ScrollArea className="h-[280px]">
                        <div className="space-y-2 pr-2">
                          {lessons.sort((a, b) => a.order - b.order).map((lesson) => (
                            <div key={lesson.lesson_id} className="p-2 rounded border border-gray-200 hover:bg-gray-50">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex-1 min-w-0 overflow-hidden">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="text-sm font-medium truncate block max-w-[140px]">{lesson.order}. {lesson.title}</span>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">
                                      <p>{lesson.order}. {lesson.title}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                  {lesson.description && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <p className="text-xs text-gray-500 truncate max-w-[140px]">{lesson.description}</p>
                                      </TooltipTrigger>
                                      <TooltipContent side="bottom" className="max-w-[300px]">
                                        <p className="text-wrap">{lesson.description}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditLessonModal(lesson)}>
                                    <Pencil className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-red-500 hover:bg-red-50"
                                    onClick={() => { setLessonToDelete(lesson); setShowDeleteLessonConfirm(true); }}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </TabsContent>

                  {/* Projects Tab */}
                  <TabsContent value="projects" className="mt-3">
                    <div className="flex justify-end mb-3">
                      <Button size="sm" onClick={() => { resetProjectForm(); setShowCreateProjectModal(true); }} className="gap-1">
                        <Plus className="w-3 h-3" /> Add Project
                      </Button>
                    </div>
                    {isLoadingProjects ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                      </div>
                    ) : projects.length === 0 ? (
                      <div className="text-center py-6">
                        <Code className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-xs text-gray-500">No projects yet</p>
                      </div>
                    ) : (
                      <ScrollArea className="h-[280px]">
                        <div className="space-y-2 pr-2">
                          {projects.sort((a, b) => a.order - b.order).map((project) => (
                            <div key={project.project_id} className="p-2 rounded border border-gray-200 hover:bg-gray-50">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex-1 min-w-0 overflow-hidden">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="text-sm font-medium truncate block max-w-[140px]">{project.order}. {project.title}</span>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">
                                      <p>{project.order}. {project.title}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                  {project.description && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <p className="text-xs text-gray-500 truncate max-w-[140px]">{project.description}</p>
                                      </TooltipTrigger>
                                      <TooltipContent side="bottom" className="max-w-[300px]">
                                        <p className="text-wrap">{project.description}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditProjectModal(project)}>
                                    <Pencil className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-red-500 hover:bg-red-50"
                                    onClick={() => { setProjectToDelete(project); setShowDeleteProjectConfirm(true); }}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </TabsContent>

                  {/* Assessments Tab */}
                  <TabsContent value="assessments" className="mt-3">
                    <div className="flex justify-end mb-3">
                      <Button size="sm" onClick={() => { resetAssessmentForm(); setShowCreateAssessmentModal(true); }} className="gap-1">
                        <Plus className="w-3 h-3" /> Add Question
                      </Button>
                    </div>
                    {isLoadingAssessments ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                      </div>
                    ) : assessments.length === 0 ? (
                      <div className="text-center py-6">
                        <HelpCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-xs text-gray-500">No assessment questions yet</p>
                      </div>
                    ) : (
                      <ScrollArea className="h-[280px]">
                        <div className="space-y-2 pr-2">
                          {assessments.sort((a, b) => a.order - b.order).map((assessment) => (
                            <div key={assessment.question_id} className="p-2 rounded border border-gray-200 hover:bg-gray-50">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex-1 min-w-0 overflow-hidden">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="text-sm font-medium truncate block max-w-[140px]">{assessment.order}. {assessment.question_text}</span>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-[300px]">
                                      <p className="text-wrap">{assessment.order}. {assessment.question_text}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                  <div className="flex gap-1 mt-1 flex-wrap">
                                    <Badge variant="outline" className="text-xs">{assessment.question_type}</Badge>
                                    <Badge variant="outline" className="text-xs">{assessment.points || 10} pts</Badge>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditAssessmentModal(assessment)}>
                                    <Pencil className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-red-500 hover:bg-red-50"
                                    onClick={() => { setAssessmentToDelete(assessment); setShowDeleteAssessmentConfirm(true); }}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
          </div>
        </div>
        </>
      )}

      {/* Create Course Modal */}
      <Dialog open={showCreateCourseModal} onOpenChange={setShowCreateCourseModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle>Create New Course</DialogTitle>
            <DialogDescription>
              Add a new course to your catalog.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto flex-1 pr-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={courseForm.title}
                  onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                  placeholder="e.g. Introduction to Python"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">URL Slug</Label>
                <Input
                  id="slug"
                  value={courseForm.slug}
                  onChange={(e) => setCourseForm({ ...courseForm, slug: e.target.value })}
                  placeholder="e.g. intro-to-python"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={courseForm.description}
                onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                placeholder="Course description..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="estimated_hours">Estimated Hours</Label>
                <Input
                  id="estimated_hours"
                  type="number"
                  value={courseForm.estimated_hours}
                  onChange={(e) =>
                    setCourseForm({ ...courseForm, estimated_hours: parseInt(e.target.value) || 1 })
                  }
                  min={1}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="difficulty">Difficulty Level</Label>
                <Select
                  value={courseForm.difficulty_level}
                  onValueChange={(value: DifficultyLevel) =>
                    setCourseForm({ ...courseForm, difficulty_level: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BEGINNER">Beginner</SelectItem>
                    <SelectItem value="INTERMEDIATE">Intermediate</SelectItem>
                    <SelectItem value="ADVANCED">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cover_image">Cover Image URL</Label>
              <Input
                id="cover_image"
                value={courseForm.cover_image_url}
                onChange={(e) => setCourseForm({ ...courseForm, cover_image_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prerequisites">Prerequisites (one per line)</Label>
              <Textarea
                id="prerequisites"
                value={courseForm.prerequisites}
                onChange={(e) => setCourseForm({ ...courseForm, prerequisites: e.target.value })}
                placeholder="Basic programming knowledge&#10;Understanding of variables"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="what_youll_learn">What You'll Learn (one per line)</Label>
              <Textarea
                id="what_youll_learn"
                value={courseForm.what_youll_learn}
                onChange={(e) => setCourseForm({ ...courseForm, what_youll_learn: e.target.value })}
                placeholder="Build real-world applications&#10;Master core concepts"
                rows={3}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="certificate"
                checked={courseForm.certificate_on_completion}
                onCheckedChange={(checked) =>
                  setCourseForm({ ...courseForm, certificate_on_completion: checked })
                }
              />
              <Label htmlFor="certificate">Certificate on completion</Label>
            </div>
          </div>
          <DialogFooter className="shrink-0 mt-4">
            <Button variant="outline" onClick={() => setShowCreateCourseModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateCourse}
              disabled={!courseForm.title || !courseForm.description || createCourseMutation.isPending}
            >
              {createCourseMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Course"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Course Modal */}
      <Dialog open={showEditCourseModal} onOpenChange={setShowEditCourseModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle>Edit Course</DialogTitle>
            <DialogDescription>
              Update course details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto flex-1 pr-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Title *</Label>
                <Input
                  id="edit-title"
                  value={courseForm.title}
                  onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-slug">URL Slug</Label>
                <Input
                  id="edit-slug"
                  value={courseForm.slug}
                  onChange={(e) => setCourseForm({ ...courseForm, slug: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description *</Label>
              <Textarea
                id="edit-description"
                value={courseForm.description}
                onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-estimated_hours">Estimated Hours</Label>
                <Input
                  id="edit-estimated_hours"
                  type="number"
                  value={courseForm.estimated_hours}
                  onChange={(e) =>
                    setCourseForm({ ...courseForm, estimated_hours: parseInt(e.target.value) || 1 })
                  }
                  min={1}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-difficulty">Difficulty Level</Label>
                <Select
                  value={courseForm.difficulty_level}
                  onValueChange={(value: DifficultyLevel) =>
                    setCourseForm({ ...courseForm, difficulty_level: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BEGINNER">Beginner</SelectItem>
                    <SelectItem value="INTERMEDIATE">Intermediate</SelectItem>
                    <SelectItem value="ADVANCED">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-cover_image">Cover Image URL</Label>
              <Input
                id="edit-cover_image"
                value={courseForm.cover_image_url}
                onChange={(e) => setCourseForm({ ...courseForm, cover_image_url: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-prerequisites">Prerequisites (one per line)</Label>
              <Textarea
                id="edit-prerequisites"
                value={courseForm.prerequisites}
                onChange={(e) => setCourseForm({ ...courseForm, prerequisites: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-what_youll_learn">What You'll Learn (one per line)</Label>
              <Textarea
                id="edit-what_youll_learn"
                value={courseForm.what_youll_learn}
                onChange={(e) => setCourseForm({ ...courseForm, what_youll_learn: e.target.value })}
                rows={3}
              />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="edit-active"
                  checked={courseForm.is_active}
                  onCheckedChange={(checked) => setCourseForm({ ...courseForm, is_active: checked })}
                />
                <Label htmlFor="edit-active">Active (Published)</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="edit-certificate"
                  checked={courseForm.certificate_on_completion}
                  onCheckedChange={(checked) =>
                    setCourseForm({ ...courseForm, certificate_on_completion: checked })
                  }
                />
                <Label htmlFor="edit-certificate">Certificate on completion</Label>
              </div>
            </div>
          </div>
          <DialogFooter className="shrink-0 mt-4">
            <Button variant="outline" onClick={() => setShowEditCourseModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateCourse}
              disabled={!courseForm.title || !courseForm.description || updateCourseMutation.isPending}
            >
              {updateCourseMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Course Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Course</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{courseToDelete?.title}"? This will also delete all
              learning paths, modules, lessons, and projects associated with this course. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => courseToDelete && deleteCourseMutation.mutate(courseToDelete.course_id)}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteCourseMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Learning Path Modal */}
      <Dialog open={showCreatePathModal} onOpenChange={setShowCreatePathModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Learning Path</DialogTitle>
            <DialogDescription>Add a new learning path to this course.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="path-title">Title *</Label>
              <Input
                id="path-title"
                value={pathForm.title}
                onChange={(e) => setPathForm({ ...pathForm, title: e.target.value })}
                placeholder="e.g. Beginner Track"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="path-description">Description</Label>
              <Textarea
                id="path-description"
                value={pathForm.description}
                onChange={(e) => setPathForm({ ...pathForm, description: e.target.value })}
                placeholder="A comprehensive path for absolute beginners..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="path-price">Price ($)</Label>
                <Input
                  id="path-price"
                  type="number"
                  step="0.01"
                  value={pathForm.price}
                  onChange={(e) => setPathForm({ ...pathForm, price: parseFloat(e.target.value) || 0 })}
                  min={0}
                  placeholder="0.00"
                />
                {pathForm.price < 0 && (
                  <p className="text-xs text-red-500">Price cannot be negative</p>
                )}
              </div>
              <div className="space-y-2 flex items-center pt-6">
                <div className="flex items-center gap-2">
                  <Switch
                    id="path-default"
                    checked={pathForm.is_default}
                    onCheckedChange={(checked) => setPathForm({ ...pathForm, is_default: checked })}
                  />
                  <Label htmlFor="path-default" className="text-sm">Set as Default Path</Label>
                </div>
              </div>
            </div>
            {pathForm.is_default && learningPaths.some(p => p.is_default) && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm text-yellow-800 flex items-start gap-2">
                <Star className="w-4 h-4 mt-0.5 text-yellow-600 shrink-0" />
                <span>Only one path can be default. Setting this will automatically unset the current default.</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="path-min-skill">Min Skill Level</Label>
                <Select value={pathForm.min_skill_level} onValueChange={(v) => setPathForm({ ...pathForm, min_skill_level: v })}>
                  <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BEGINNER">Beginner</SelectItem>
                    <SelectItem value="INTERMEDIATE">Intermediate</SelectItem>
                    <SelectItem value="ADVANCED">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="path-max-skill">Max Skill Level</Label>
                <Select value={pathForm.max_skill_level} onValueChange={(v) => setPathForm({ ...pathForm, max_skill_level: v })}>
                  <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BEGINNER">Beginner</SelectItem>
                    <SelectItem value="INTERMEDIATE">Intermediate</SelectItem>
                    <SelectItem value="ADVANCED">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="path-tags">Tags (comma-separated)</Label>
              <Input
                id="path-tags"
                value={pathForm.tags}
                onChange={(e) => setPathForm({ ...pathForm, tags: e.target.value })}
                placeholder="e.g. python, beginner, fundamentals"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreatePathModal(false)}>Cancel</Button>
            <Button 
              onClick={handleCreatePath} 
              disabled={!pathForm.title || pathForm.price < 0 || createPathMutation.isPending}
            >
              {createPathMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</> : "Create Path"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Learning Path Modal */}
      <Dialog open={showEditPathModal} onOpenChange={setShowEditPathModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Learning Path</DialogTitle>
            <DialogDescription>Update this learning path.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-path-title">Title *</Label>
              <Input
                id="edit-path-title"
                value={pathForm.title}
                onChange={(e) => setPathForm({ ...pathForm, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-path-description">Description</Label>
              <Textarea
                id="edit-path-description"
                value={pathForm.description}
                onChange={(e) => setPathForm({ ...pathForm, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-path-price">Price ($)</Label>
                <Input
                  id="edit-path-price"
                  type="number"
                  step="0.01"
                  value={pathForm.price}
                  onChange={(e) => setPathForm({ ...pathForm, price: parseFloat(e.target.value) || 0 })}
                  min={0}
                />
                {pathForm.price < 0 && (
                  <p className="text-xs text-red-500">Price cannot be negative</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-path-min-skill">Min Skill Level</Label>
                <Select value={pathForm.min_skill_level} onValueChange={(v) => setPathForm({ ...pathForm, min_skill_level: v })}>
                  <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BEGINNER">Beginner</SelectItem>
                    <SelectItem value="INTERMEDIATE">Intermediate</SelectItem>
                    <SelectItem value="ADVANCED">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-path-max-skill">Max Skill Level</Label>
              <Select value={pathForm.max_skill_level} onValueChange={(v) => setPathForm({ ...pathForm, max_skill_level: v })}>
                <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BEGINNER">Beginner</SelectItem>
                  <SelectItem value="INTERMEDIATE">Intermediate</SelectItem>
                  <SelectItem value="ADVANCED">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-path-tags">Tags (comma-separated)</Label>
              <Input
                id="edit-path-tags"
                value={pathForm.tags}
                onChange={(e) => setPathForm({ ...pathForm, tags: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditPathModal(false)}>Cancel</Button>
            <Button 
              onClick={handleUpdatePath} 
              disabled={!pathForm.title || pathForm.price < 0 || updatePathMutation.isPending}
            >
              {updatePathMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Path Confirmation */}
      <AlertDialog open={showDeletePathConfirm} onOpenChange={setShowDeletePathConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Learning Path</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{pathToDelete?.title}"? This will also delete all modules and content. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => pathToDelete && deletePathMutation.mutate(pathToDelete.path_id)} className="bg-red-600 hover:bg-red-700">
              {deletePathMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Deleting...</> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Module Modal - Admin Style */}
      {showCreateModuleModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowCreateModuleModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
                <h2 className="text-xl font-bold text-gray-900">Add New Module</h2>
                <button
                  onClick={() => setShowCreateModuleModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                {/* Learning Path Selector */}
                {learningPaths.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Learning Path *</label>
                    <select
                      value={selectedPathForModule || ""}
                      onChange={(e) => setSelectedPathForModule(e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="">Select a learning path</option>
                      {learningPaths.map((path) => (
                        <option key={path.path_id} value={path.path_id}>
                          {path.title} {path.is_default ? "(Default)" : ""}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Select which learning path this module belongs to. Modules are path-specific.
                    </p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Module Title *</label>
                  <input
                    type="text"
                    value={moduleForm.title}
                    onChange={(e) => handleModuleTitleChange(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., React Fundamentals"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Module Slug</label>
                  <input
                    type="text"
                    value={moduleForm.slug}
                    onChange={(e) => setModuleForm({ ...moduleForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., react-fundamentals"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={moduleForm.description}
                    onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                    placeholder="Brief description of the module..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Order</label>
                  <input
                    type="number"
                    value={moduleForm.order}
                    onChange={(e) => setModuleForm({ ...moduleForm, order: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                  />
                </div>
                
                {/* Module Availability Settings */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Module Availability Settings</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Unlock After Days</label>
                      <input
                        type="number"
                        value={moduleForm.unlock_after_days}
                        onChange={(e) => setModuleForm({ ...moduleForm, unlock_after_days: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                        placeholder="0"
                      />
                      <p className="text-xs text-gray-500 mt-1">Days after registration to unlock</p>
                    </div>
                    <div className="flex items-center">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={moduleForm.is_available_by_default}
                          onChange={(e) => setModuleForm({ ...moduleForm, is_available_by_default: e.target.checked })}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700">Available by Default</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Project Deadline Settings */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Project Deadline Settings (Days)</h4>
                  <p className="text-xs text-gray-500 mb-3">Set deadline tiers for project submissions. Points are reduced after each deadline.</p>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">1st Deadline (100%)</label>
                      <input
                        type="number"
                        value={moduleForm.first_deadline_days ?? ""}
                        onChange={(e) => setModuleForm({ ...moduleForm, first_deadline_days: e.target.value ? parseInt(e.target.value) : null })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="1"
                        placeholder="e.g., 7"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">2nd Deadline (50%)</label>
                      <input
                        type="number"
                        value={moduleForm.second_deadline_days ?? ""}
                        onChange={(e) => setModuleForm({ ...moduleForm, second_deadline_days: e.target.value ? parseInt(e.target.value) : null })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="1"
                        placeholder="e.g., 14"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">3rd Deadline (25%)</label>
                      <input
                        type="number"
                        value={moduleForm.third_deadline_days ?? ""}
                        onChange={(e) => setModuleForm({ ...moduleForm, third_deadline_days: e.target.value ? parseInt(e.target.value) : null })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="1"
                        placeholder="e.g., 21"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3 shrink-0">
                <Button variant="outline" onClick={() => setShowCreateModuleModal(false)} disabled={createModuleMutation.isPending}>
                  Cancel
                </Button>
                <Button 
                  className="bg-blue-600 hover:bg-blue-700" 
                  onClick={handleCreateModule}
                  disabled={createModuleMutation.isPending || isLoadingPaths}
                >
                  {createModuleMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Add Module
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit Module Modal - Admin Style */}
      {showEditModuleModal && editingModule && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowEditModuleModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
                <h2 className="text-xl font-bold text-gray-900">Edit Module</h2>
                <button
                  onClick={() => setShowEditModuleModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Module Title *</label>
                  <input
                    type="text"
                    value={moduleForm.title}
                    onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., React Fundamentals"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={moduleForm.description}
                    onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                    placeholder="Brief description of the module..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Order</label>
                    <input
                      type="number"
                      value={moduleForm.order}
                      onChange={(e) => setModuleForm({ ...moduleForm, order: parseInt(e.target.value) || 1 })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Estimated Hours</label>
                    <input
                      type="number"
                      value={editingModule.estimated_hours || 0}
                      onChange={(e) => setEditingModule({ ...editingModule, estimated_hours: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                      step="0.5"
                    />
                  </div>
                </div>
                
                {/* Module Availability Settings */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Module Availability Settings</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Unlock After Days</label>
                      <input
                        type="number"
                        value={moduleForm.unlock_after_days}
                        onChange={(e) => setModuleForm({ ...moduleForm, unlock_after_days: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                        placeholder="0"
                      />
                      <p className="text-xs text-gray-500 mt-1">Days after registration to unlock</p>
                    </div>
                    <div className="flex items-center">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={moduleForm.is_available_by_default}
                          onChange={(e) => setModuleForm({ ...moduleForm, is_available_by_default: e.target.checked })}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700">Available by Default</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Project Deadline Settings */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Project Deadline Settings (Days)</h4>
                  <p className="text-xs text-gray-500 mb-3">Set deadline tiers for project submissions. Points are reduced after each deadline.</p>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">1st Deadline (100%)</label>
                      <input
                        type="number"
                        value={moduleForm.first_deadline_days ?? ""}
                        onChange={(e) => setModuleForm({ ...moduleForm, first_deadline_days: e.target.value ? parseInt(e.target.value) : null })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="1"
                        placeholder="e.g., 7"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">2nd Deadline (50%)</label>
                      <input
                        type="number"
                        value={moduleForm.second_deadline_days ?? ""}
                        onChange={(e) => setModuleForm({ ...moduleForm, second_deadline_days: e.target.value ? parseInt(e.target.value) : null })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="1"
                        placeholder="e.g., 14"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">3rd Deadline (25%)</label>
                      <input
                        type="number"
                        value={moduleForm.third_deadline_days ?? ""}
                        onChange={(e) => setModuleForm({ ...moduleForm, third_deadline_days: e.target.value ? parseInt(e.target.value) : null })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="1"
                        placeholder="e.g., 21"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3 shrink-0">
                <Button variant="outline" onClick={() => setShowEditModuleModal(false)} disabled={updateModuleMutation.isPending}>
                  Cancel
                </Button>
                <Button 
                  className="bg-blue-600 hover:bg-blue-700" 
                  onClick={handleUpdateModule}
                  disabled={updateModuleMutation.isPending}
                >
                  {updateModuleMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Module Confirmation */}
      <AlertDialog open={showDeleteModuleConfirm} onOpenChange={setShowDeleteModuleConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Module</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{moduleToDelete?.title}"? This will also delete all lessons, projects, and assessments. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => moduleToDelete && deleteModuleMutation.mutate(moduleToDelete.module_id)} className="bg-red-600 hover:bg-red-700">
              {deleteModuleMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Deleting...</> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Lesson Modal */}
      <Dialog open={showCreateLessonModal} onOpenChange={setShowCreateLessonModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle>Create Lesson</DialogTitle>
            <DialogDescription>Add a new lesson to this module.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto flex-1 pr-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lesson-title">Title *</Label>
                <Input
                  id="lesson-title"
                  value={lessonForm.title}
                  onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                  placeholder="e.g. Introduction to Variables"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lesson-order">Order</Label>
                <Input
                  id="lesson-order"
                  type="number"
                  value={lessonForm.order}
                  onChange={(e) => setLessonForm({ ...lessonForm, order: parseInt(e.target.value) || 1 })}
                  min={1}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lesson-description">Description *</Label>
              <Textarea
                id="lesson-description"
                value={lessonForm.description}
                onChange={(e) => setLessonForm({ ...lessonForm, description: e.target.value })}
                placeholder="Brief description of what this lesson covers..."
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lesson-type">Content Type</Label>
                <Select value={lessonForm.content_type} onValueChange={(v) => setLessonForm({ ...lessonForm, content_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="theory">📖 Theory</SelectItem>
                    <SelectItem value="coding">💻 Coding</SelectItem>
                    <SelectItem value="debugging">🐛 Debugging</SelectItem>
                    <SelectItem value="quiz">❓ Quiz</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lesson-minutes">Estimated Minutes</Label>
                <Input
                  id="lesson-minutes"
                  type="number"
                  value={lessonForm.estimated_minutes}
                  onChange={(e) => setLessonForm({ ...lessonForm, estimated_minutes: parseInt(e.target.value) || 30 })}
                  min={1}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lesson-youtube">YouTube Video URL (optional)</Label>
              <Input
                id="lesson-youtube"
                value={lessonForm.youtube_video_url}
                onChange={(e) => setLessonForm({ ...lessonForm, youtube_video_url: e.target.value })}
                placeholder="https://youtube.com/watch?v=..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lesson-content">Lesson Content (Markdown supported)</Label>
              <Textarea
                id="lesson-content"
                value={lessonForm.content}
                onChange={(e) => setLessonForm({ ...lessonForm, content: e.target.value })}
                placeholder="# Lesson Title&#10;&#10;Content goes here. Supports **markdown** formatting."
                rows={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lesson-resources">External Resources (one URL per line)</Label>
              <Textarea
                id="lesson-resources"
                value={lessonForm.external_resources}
                onChange={(e) => setLessonForm({ ...lessonForm, external_resources: e.target.value })}
                placeholder="https://docs.python.org/3/tutorial/&#10;https://realpython.com/"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lesson-outcomes">Expected Outcomes (one per line)</Label>
              <Textarea
                id="lesson-outcomes"
                value={lessonForm.expected_outcomes}
                onChange={(e) => setLessonForm({ ...lessonForm, expected_outcomes: e.target.value })}
                placeholder="Understand what variables are&#10;Know how to declare variables&#10;Understand basic data types"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="shrink-0 mt-4">
            <Button variant="outline" onClick={() => setShowCreateLessonModal(false)}>Cancel</Button>
            <Button onClick={handleCreateLesson} disabled={!lessonForm.title || !lessonForm.description || createLessonMutation.isPending}>
              {createLessonMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</> : "Create Lesson"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Lesson Modal */}
      <Dialog open={showEditLessonModal} onOpenChange={setShowEditLessonModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle>Edit Lesson</DialogTitle>
            <DialogDescription>Update this lesson.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto flex-1 pr-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-lesson-title">Title *</Label>
                <Input id="edit-lesson-title" value={lessonForm.title} onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-lesson-order">Order</Label>
                <Input id="edit-lesson-order" type="number" value={lessonForm.order} onChange={(e) => setLessonForm({ ...lessonForm, order: parseInt(e.target.value) || 1 })} min={1} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-lesson-description">Description *</Label>
              <Textarea id="edit-lesson-description" value={lessonForm.description} onChange={(e) => setLessonForm({ ...lessonForm, description: e.target.value })} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-lesson-type">Content Type</Label>
                <Select value={lessonForm.content_type} onValueChange={(v) => setLessonForm({ ...lessonForm, content_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="theory">📖 Theory</SelectItem>
                    <SelectItem value="coding">💻 Coding</SelectItem>
                    <SelectItem value="debugging">🐛 Debugging</SelectItem>
                    <SelectItem value="quiz">❓ Quiz</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-lesson-minutes">Estimated Minutes</Label>
                <Input id="edit-lesson-minutes" type="number" value={lessonForm.estimated_minutes} onChange={(e) => setLessonForm({ ...lessonForm, estimated_minutes: parseInt(e.target.value) || 30 })} min={1} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-lesson-youtube">YouTube Video URL (optional)</Label>
              <Input id="edit-lesson-youtube" value={lessonForm.youtube_video_url} onChange={(e) => setLessonForm({ ...lessonForm, youtube_video_url: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-lesson-content">Lesson Content (Markdown supported)</Label>
              <Textarea id="edit-lesson-content" value={lessonForm.content} onChange={(e) => setLessonForm({ ...lessonForm, content: e.target.value })} rows={6} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-lesson-resources">External Resources (one URL per line)</Label>
              <Textarea id="edit-lesson-resources" value={lessonForm.external_resources} onChange={(e) => setLessonForm({ ...lessonForm, external_resources: e.target.value })} rows={2} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-lesson-outcomes">Expected Outcomes (one per line)</Label>
              <Textarea id="edit-lesson-outcomes" value={lessonForm.expected_outcomes} onChange={(e) => setLessonForm({ ...lessonForm, expected_outcomes: e.target.value })} rows={3} />
            </div>
          </div>
          <DialogFooter className="shrink-0 mt-4">
            <Button variant="outline" onClick={() => setShowEditLessonModal(false)}>Cancel</Button>
            <Button onClick={handleUpdateLesson} disabled={!lessonForm.title || !lessonForm.description || updateLessonMutation.isPending}>
              {updateLessonMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Lesson Confirmation */}
      <AlertDialog open={showDeleteLessonConfirm} onOpenChange={setShowDeleteLessonConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lesson</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{lessonToDelete?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => lessonToDelete && deleteLessonMutation.mutate(lessonToDelete.lesson_id)} className="bg-red-600 hover:bg-red-700">
              {deleteLessonMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Deleting...</> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Project Modal */}
      <Dialog open={showCreateProjectModal} onOpenChange={setShowCreateProjectModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Project</DialogTitle>
            <DialogDescription>Add a new project to this module.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="project-title">Title *</Label>
                <Input
                  id="project-title"
                  value={projectForm.title}
                  onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })}
                  placeholder="e.g. Build a Calculator"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-order">Order</Label>
                <Input
                  id="project-order"
                  type="number"
                  value={projectForm.order}
                  onChange={(e) => setProjectForm({ ...projectForm, order: parseInt(e.target.value) || 1 })}
                  min={1}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-description">Description *</Label>
              <Textarea
                id="project-description"
                value={projectForm.description}
                onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-hours">Estimated Hours</Label>
              <Input
                id="project-hours"
                type="number"
                value={projectForm.estimated_hours}
                onChange={(e) => setProjectForm({ ...projectForm, estimated_hours: parseInt(e.target.value) || 2 })}
                min={1}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-starter">Starter Repo URL</Label>
              <Input
                id="project-starter"
                value={projectForm.starter_repo_url}
                onChange={(e) => setProjectForm({ ...projectForm, starter_repo_url: e.target.value })}
                placeholder="https://github.com/..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-skills">Required Skills (comma-separated)</Label>
              <Input
                id="project-skills"
                value={projectForm.required_skills}
                onChange={(e) => setProjectForm({ ...projectForm, required_skills: e.target.value })}
                placeholder="e.g. variables, functions, loops"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateProjectModal(false)}>Cancel</Button>
            <Button onClick={handleCreateProject} disabled={!projectForm.title || !projectForm.description || createProjectMutation.isPending}>
              {createProjectMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</> : "Create Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Project Modal */}
      <Dialog open={showEditProjectModal} onOpenChange={setShowEditProjectModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>Update this project.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-project-title">Title *</Label>
                <Input id="edit-project-title" value={projectForm.title} onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-project-order">Order</Label>
                <Input id="edit-project-order" type="number" value={projectForm.order} onChange={(e) => setProjectForm({ ...projectForm, order: parseInt(e.target.value) || 1 })} min={1} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-project-description">Description *</Label>
              <Textarea id="edit-project-description" value={projectForm.description} onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })} rows={3} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-project-hours">Estimated Hours</Label>
              <Input id="edit-project-hours" type="number" value={projectForm.estimated_hours} onChange={(e) => setProjectForm({ ...projectForm, estimated_hours: parseInt(e.target.value) || 2 })} min={1} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-project-starter">Starter Repo URL</Label>
              <Input id="edit-project-starter" value={projectForm.starter_repo_url} onChange={(e) => setProjectForm({ ...projectForm, starter_repo_url: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-project-skills">Required Skills (comma-separated)</Label>
              <Input id="edit-project-skills" value={projectForm.required_skills} onChange={(e) => setProjectForm({ ...projectForm, required_skills: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditProjectModal(false)}>Cancel</Button>
            <Button onClick={handleUpdateProject} disabled={!projectForm.title || !projectForm.description || updateProjectMutation.isPending}>
              {updateProjectMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Project Confirmation */}
      <AlertDialog open={showDeleteProjectConfirm} onOpenChange={setShowDeleteProjectConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{projectToDelete?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => projectToDelete && deleteProjectMutation.mutate(projectToDelete.project_id)} className="bg-red-600 hover:bg-red-700">
              {deleteProjectMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Deleting...</> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Assessment Modal */}
      <Dialog open={showCreateAssessmentModal} onOpenChange={setShowCreateAssessmentModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle>Create Quiz Question</DialogTitle>
            <DialogDescription>Add a new question to this module's quiz.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto flex-1 pr-2">
            <div className="space-y-2">
              <Label htmlFor="assessment-question">Question *</Label>
              <Textarea
                id="assessment-question"
                value={assessmentForm.question_text}
                onChange={(e) => setAssessmentForm({ ...assessmentForm, question_text: e.target.value })}
                placeholder="What is the correct way to declare a variable in Python?"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="assessment-type">Question Type *</Label>
                <Select value={assessmentForm.question_type} onValueChange={(v: "multiple_choice" | "debugging" | "coding" | "short_answer") => setAssessmentForm({ ...assessmentForm, question_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="multiple_choice">Single Choice</SelectItem>
                    <SelectItem value="short_answer">Multiple Choice</SelectItem>
                    <SelectItem value="coding">True/False</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="assessment-difficulty">Difficulty</Label>
                <Select value={assessmentForm.difficulty_level} onValueChange={(v: DifficultyLevel) => setAssessmentForm({ ...assessmentForm, difficulty_level: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BEGINNER">Easy</SelectItem>
                    <SelectItem value="INTERMEDIATE">Medium</SelectItem>
                    <SelectItem value="ADVANCED">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="assessment-points">Points *</Label>
                <Input
                  id="assessment-points"
                  type="number"
                  value={assessmentForm.points}
                  onChange={(e) => setAssessmentForm({ ...assessmentForm, points: parseInt(e.target.value) || 10 })}
                  min={1}
                />
                {assessmentForm.points <= 0 && (
                  <p className="text-xs text-red-500">Points must be &gt; 0</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="assessment-order">Order</Label>
              <Input
                id="assessment-order"
                type="number"
                value={assessmentForm.order}
                onChange={(e) => setAssessmentForm({ ...assessmentForm, order: parseInt(e.target.value) || 1 })}
                min={1}
                className="w-24"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assessment-options">Answer Options * (one per line)</Label>
              <Textarea
                id="assessment-options"
                value={assessmentForm.options}
                onChange={(e) => setAssessmentForm({ ...assessmentForm, options: e.target.value })}
                placeholder="var x = 5&#10;x = 5&#10;let x = 5&#10;int x = 5"
                rows={4}
              />
              <p className="text-xs text-gray-500">At least 2 options required for choice questions</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="assessment-answer">Correct Answer(s) *</Label>
              <Textarea
                id="assessment-answer"
                value={assessmentForm.correct_answer}
                onChange={(e) => setAssessmentForm({ ...assessmentForm, correct_answer: e.target.value })}
                placeholder="x = 5"
                rows={2}
              />
              <p className="text-xs text-gray-500">For single choice: enter the exact matching option. For multiple choice: enter each correct option on a new line.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="assessment-explanation">Explanation (shown after answering)</Label>
              <Textarea
                id="assessment-explanation"
                value={assessmentForm.explanation}
                onChange={(e) => setAssessmentForm({ ...assessmentForm, explanation: e.target.value })}
                placeholder="In Python, you don't need to declare variable types. Simply assign a value with the = operator."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="shrink-0 mt-4">
            <Button variant="outline" onClick={() => setShowCreateAssessmentModal(false)}>Cancel</Button>
            <Button 
              onClick={handleCreateAssessment} 
              disabled={
                !assessmentForm.question_text || 
                !assessmentForm.correct_answer || 
                assessmentForm.points <= 0 ||
                createAssessmentMutation.isPending
              }
            >
              {createAssessmentMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</> : "Create Question"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Assessment Modal */}
      <Dialog open={showEditAssessmentModal} onOpenChange={setShowEditAssessmentModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle>Edit Quiz Question</DialogTitle>
            <DialogDescription>Update this question.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto flex-1 pr-2">
            <div className="space-y-2">
              <Label htmlFor="edit-assessment-question">Question *</Label>
              <Textarea id="edit-assessment-question" value={assessmentForm.question_text} onChange={(e) => setAssessmentForm({ ...assessmentForm, question_text: e.target.value })} rows={3} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-assessment-type">Question Type *</Label>
                <Select value={assessmentForm.question_type} onValueChange={(v: "multiple_choice" | "debugging" | "coding" | "short_answer") => setAssessmentForm({ ...assessmentForm, question_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="multiple_choice">Single Choice</SelectItem>
                    <SelectItem value="short_answer">Multiple Choice</SelectItem>
                    <SelectItem value="coding">True/False</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-assessment-difficulty">Difficulty</Label>
                <Select value={assessmentForm.difficulty_level} onValueChange={(v: DifficultyLevel) => setAssessmentForm({ ...assessmentForm, difficulty_level: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BEGINNER">Easy</SelectItem>
                    <SelectItem value="INTERMEDIATE">Medium</SelectItem>
                    <SelectItem value="ADVANCED">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-assessment-points">Points *</Label>
                <Input id="edit-assessment-points" type="number" value={assessmentForm.points} onChange={(e) => setAssessmentForm({ ...assessmentForm, points: parseInt(e.target.value) || 10 })} min={1} />
                {assessmentForm.points <= 0 && (
                  <p className="text-xs text-red-500">Points must be &gt; 0</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-assessment-order">Order</Label>
              <Input id="edit-assessment-order" type="number" value={assessmentForm.order} onChange={(e) => setAssessmentForm({ ...assessmentForm, order: parseInt(e.target.value) || 1 })} min={1} className="w-24" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-assessment-options">Answer Options * (one per line)</Label>
              <Textarea id="edit-assessment-options" value={assessmentForm.options} onChange={(e) => setAssessmentForm({ ...assessmentForm, options: e.target.value })} rows={4} />
              <p className="text-xs text-gray-500">At least 2 options required for choice questions</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-assessment-answer">Correct Answer(s) *</Label>
              <Textarea id="edit-assessment-answer" value={assessmentForm.correct_answer} onChange={(e) => setAssessmentForm({ ...assessmentForm, correct_answer: e.target.value })} rows={2} />
              <p className="text-xs text-gray-500">For single choice: enter the exact matching option. For multiple choice: enter each correct option on a new line.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-assessment-explanation">Explanation (shown after answering)</Label>
              <Textarea id="edit-assessment-explanation" value={assessmentForm.explanation} onChange={(e) => setAssessmentForm({ ...assessmentForm, explanation: e.target.value })} rows={3} />
            </div>
          </div>
          <DialogFooter className="shrink-0 mt-4">
            <Button variant="outline" onClick={() => setShowEditAssessmentModal(false)}>Cancel</Button>
            <Button 
              onClick={handleUpdateAssessment} 
              disabled={
                !assessmentForm.question_text || 
                !assessmentForm.correct_answer || 
                assessmentForm.points <= 0 ||
                updateAssessmentMutation.isPending
              }
            >
              {updateAssessmentMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Assessment Confirmation */}
      <AlertDialog open={showDeleteAssessmentConfirm} onOpenChange={setShowDeleteAssessmentConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Assessment Question</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this question? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => assessmentToDelete && deleteAssessmentMutation.mutate(assessmentToDelete.question_id)} className="bg-red-600 hover:bg-red-700">
              {deleteAssessmentMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Deleting...</> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
