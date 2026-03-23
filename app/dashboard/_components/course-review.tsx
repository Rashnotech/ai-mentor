"use client"

import { useState, useEffect } from "react"
import { Star, X, Loader2, Send, Edit, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import {
  courseReviewsApi,
  type CourseReviewCreatePayload,
  type CourseReviewResponse,
  type CourseReviewsListResponse,
} from "@/lib/api"

interface CourseReviewModalProps {
  isOpen: boolean
  onClose: () => void
  courseId: number
  courseTitle: string
  onReviewSubmitted?: () => void
}

export function CourseReviewModal({
  isOpen,
  onClose,
  courseId,
  courseTitle,
  onReviewSubmitted,
}: CourseReviewModalProps) {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [reviewText, setReviewText] = useState("")
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [existingReview, setExistingReview] = useState<CourseReviewResponse | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  // Fetch existing review on mount
  useEffect(() => {
    if (isOpen) {
      fetchMyReview()
    }
  }, [isOpen, courseId])

  const fetchMyReview = async () => {
    setIsLoading(true)
    try {
      const review = await courseReviewsApi.getMyReview(courseId)
      if (review) {
        setExistingReview(review)
        setRating(review.rating)
        setReviewText(review.review_text || "")
        setIsAnonymous(review.is_anonymous)
      } else {
        setExistingReview(null)
        setRating(0)
        setReviewText("")
        setIsAnonymous(false)
      }
    } catch (err) {
      console.error("Failed to fetch review:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("Please select a rating")
      return
    }

    setIsSubmitting(true)
    try {
      if (existingReview && isEditing) {
        // Update existing review
        await courseReviewsApi.updateReview(existingReview.review_id, {
          rating,
          review_text: reviewText || undefined,
          is_anonymous: isAnonymous,
        })
        toast.success("Review updated successfully!")
      } else {
        // Create new review
        const payload: CourseReviewCreatePayload = {
          course_id: courseId,
          rating,
          review_text: reviewText || undefined,
          is_anonymous: isAnonymous,
        }
        await courseReviewsApi.createReview(payload)
        toast.success("Review submitted successfully!")
      }
      onReviewSubmitted?.()
      onClose()
    } catch (err) {
      console.error("Failed to submit review:", err)
      toast.error("Failed to submit review. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!existingReview) return
    
    if (!confirm("Are you sure you want to delete your review?")) {
      return
    }

    setIsSubmitting(true)
    try {
      await courseReviewsApi.deleteReview(existingReview.review_id)
      toast.success("Review deleted successfully!")
      onReviewSubmitted?.()
      onClose()
    } catch (err) {
      console.error("Failed to delete review:", err)
      toast.error("Failed to delete review. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-xl shadow-2xl w-full max-w-lg"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {existingReview && !isEditing ? "Your Review" : "Rate & Review"}
              </h2>
              <p className="text-sm text-gray-500 mt-1 line-clamp-1">{courseTitle}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : existingReview && !isEditing ? (
              // Show existing review
              <div className="space-y-4">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-6 h-6 ${
                        star <= existingReview.rating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                  <span className="ml-2 text-sm text-gray-500">
                    {existingReview.rating}/5
                  </span>
                </div>

                {existingReview.review_text && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {existingReview.review_text}
                    </p>
                  </div>
                )}

                {existingReview.is_anonymous && (
                  <p className="text-sm text-gray-500 italic">Posted anonymously</p>
                )}

                <p className="text-xs text-gray-400">
                  Submitted on{" "}
                  {new Date(existingReview.created_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                    className="flex-1"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Review
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleDelete}
                    disabled={isSubmitting}
                    className="text-red-600 hover:bg-red-50 border-red-200"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              // Show review form
              <div className="space-y-6">
                {/* Star Rating */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    How would you rate this course?
                  </label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setRating(star)}
                        className="p-1 transition-transform hover:scale-110"
                      >
                        <Star
                          className={`w-8 h-8 transition-colors ${
                            star <= (hoverRating || rating)
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-300 hover:text-yellow-200"
                          }`}
                        />
                      </button>
                    ))}
                    <span className="ml-3 text-sm text-gray-500">
                      {rating > 0 ? `${rating}/5` : "Select rating"}
                    </span>
                  </div>
                </div>

                {/* Review Text */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Write a review (optional)
                  </label>
                  <textarea
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder="Share your experience with this course..."
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px] resize-none"
                  />
                </div>

                {/* Anonymous Toggle */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="isAnonymous"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="isAnonymous" className="text-sm text-gray-700">
                    Post anonymously
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          {!isLoading && (existingReview === null || isEditing) && (
            <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
              {isEditing && (
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
              )}
              <Button
                className="bg-blue-600 hover:bg-blue-700"
                onClick={handleSubmit}
                disabled={isSubmitting || rating === 0}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    {existingReview ? "Update Review" : "Submit Review"}
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ============================================================================
// COURSE REVIEWS LIST COMPONENT
// ============================================================================

interface CourseReviewsListProps {
  courseId: number
}

export function CourseReviewsList({ courseId }: CourseReviewsListProps) {
  const [reviewsData, setReviewsData] = useState<CourseReviewsListResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchReviews()
  }, [courseId])

  const fetchReviews = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await courseReviewsApi.getCourseReviews(courseId, {
        approved_only: true,
        limit: 10,
      })
      setReviewsData(data)
    } catch (err) {
      console.error("Failed to fetch reviews:", err)
      setError("Failed to load reviews")
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>{error}</p>
      </div>
    )
  }

  if (!reviewsData || reviewsData.reviews.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Star className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p>No reviews yet</p>
        <p className="text-sm">Be the first to review this course!</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Rating Summary */}
      <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="text-3xl font-bold text-gray-900">
            {(reviewsData.average_rating / 10).toFixed(1)}
          </div>
          <div className="flex items-center gap-0.5 mt-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-4 h-4 ${
                  star <= Math.round(reviewsData.average_rating / 10)
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-gray-300"
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {reviewsData.total_count} review{reviewsData.total_count !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Rating Distribution */}
        <div className="flex-1 space-y-1">
          {[5, 4, 3, 2, 1].map((stars) => {
            const count = reviewsData.rating_distribution[stars.toString() as keyof typeof reviewsData.rating_distribution] || 0
            const percentage = reviewsData.total_count > 0 ? (count / reviewsData.total_count) * 100 : 0
            return (
              <div key={stars} className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-3">{stars}</span>
                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-400 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 w-6">{count}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {reviewsData.reviews.map((review) => (
          <div key={review.review_id} className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-medium text-gray-900">
                  {review.is_anonymous ? "Anonymous" : review.user_name}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${
                        star <= review.rating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
              </div>
              <span className="text-xs text-gray-400">
                {new Date(review.created_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
            {review.review_text && (
              <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">
                {review.review_text}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
