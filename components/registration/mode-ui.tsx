"use client"

import { CheckCircle2, Users, Sparkles, AlertTriangle } from "lucide-react"
import type { LearningModeConfig, ModeFeature } from "@/types/registration"

// ============================================
// FEATURE ITEM COMPONENT
// ============================================

interface FeatureItemProps {
  feature: ModeFeature
  isSelected?: boolean
  variant?: "default" | "compact"
}

export function FeatureItem({ feature, isSelected = false, variant = "default" }: FeatureItemProps) {
  const textSize = variant === "compact" ? "text-xs" : "text-sm"
  const iconSize = variant === "compact" ? "w-3 h-3" : "w-4 h-4"

  return (
    <li className={`flex items-center gap-2 ${textSize} ${
      feature.available 
        ? isSelected ? "text-blue-900" : "text-gray-700"
        : "text-gray-400 line-through"
    }`}>
      {feature.available ? (
        <CheckCircle2 className={`${iconSize} flex-shrink-0 ${
          isSelected ? "text-blue-600" : "text-green-500"
        }`} />
      ) : (
        <div className={`${iconSize} flex-shrink-0 rounded-full border-2 border-gray-300`} />
      )}
      {feature.text}
    </li>
  )
}

// ============================================
// MODE BADGE COMPONENT
// ============================================

interface ModeBadgeProps {
  mode: "bootcamp" | "self-paced"
  size?: "sm" | "md"
}

export function ModeBadge({ mode, size = "md" }: ModeBadgeProps) {
  const sizeClasses = size === "sm" 
    ? "px-2 py-0.5 text-xs" 
    : "px-3 py-1 text-sm"

  if (mode === "bootcamp") {
    return (
      <span className={`inline-flex items-center gap-1 ${sizeClasses} bg-blue-100 text-blue-700 rounded-full font-medium`}>
        <Users className={size === "sm" ? "w-3 h-3" : "w-4 h-4"} />
        Bootcamp
      </span>
    )
  }

  return (
    <span className={`inline-flex items-center gap-1 ${sizeClasses} bg-purple-100 text-purple-700 rounded-full font-medium`}>
      <Sparkles className={size === "sm" ? "w-3 h-3" : "w-4 h-4"} />
      Self-Paced
    </span>
  )
}

// ============================================
// WARNING BANNER COMPONENT
// ============================================

interface WarningBannerProps {
  warnings: string[]
  title?: string
  variant?: "amber" | "red"
}

export function WarningBanner({ warnings, title, variant = "amber" }: WarningBannerProps) {
  const colorClasses = variant === "red" 
    ? {
        bg: "bg-red-50",
        border: "border-red-200",
        icon: "text-red-600",
        title: "text-red-900",
        text: "text-red-800",
        bullet: "text-red-500",
      }
    : {
        bg: "bg-amber-50",
        border: "border-amber-200",
        icon: "text-amber-600",
        title: "text-amber-900",
        text: "text-amber-800",
        bullet: "text-amber-500",
      }

  return (
    <div className={`${colorClasses.bg} border ${colorClasses.border} rounded-xl p-4`}>
      <div className="flex items-start gap-3">
        <AlertTriangle className={`w-5 h-5 ${colorClasses.icon} flex-shrink-0 mt-0.5`} />
        <div>
          {title && (
            <h4 className={`font-semibold ${colorClasses.title} mb-2`}>
              {title}
            </h4>
          )}
          <ul className="space-y-1">
            {warnings.map((warning, idx) => (
              <li key={idx} className={`text-sm ${colorClasses.text} flex items-start gap-2`}>
                <span className={colorClasses.bullet}>•</span>
                {warning}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

// ============================================
// FEATURE TAG COMPONENT
// ============================================

interface FeatureTagProps {
  text: string
  variant?: "success" | "neutral" | "warning"
}

export function FeatureTag({ text, variant = "success" }: FeatureTagProps) {
  const variantClasses = {
    success: "bg-green-50 text-green-700",
    neutral: "bg-gray-100 text-gray-600",
    warning: "bg-amber-50 text-amber-700",
  }

  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 text-sm rounded-full ${variantClasses[variant]}`}>
      <CheckCircle2 className="w-3 h-3" />
      {text}
    </span>
  )
}

// ============================================
// COMPARISON ROW COMPONENT
// ============================================

interface ComparisonRowProps {
  aspect: string
  bootcamp: string
  selfPaced: string
}

export function ComparisonRow({ aspect, bootcamp, selfPaced }: ComparisonRowProps) {
  return (
    <>
      <div className="text-gray-700 py-1.5 border-t border-gray-200">
        {aspect}
      </div>
      <div className="text-center py-1.5 border-t border-gray-200 text-gray-600">
        {bootcamp}
      </div>
      <div className="text-center py-1.5 border-t border-gray-200 text-gray-600">
        {selfPaced}
      </div>
    </>
  )
}

// ============================================
// MODE SUMMARY CARD COMPONENT
// ============================================

interface ModeSummaryCardProps {
  mode: LearningModeConfig
  cohortName?: string
}

export function ModeSummaryCard({ mode, cohortName }: ModeSummaryCardProps) {
  const IconComponent = mode.id === "bootcamp" ? Users : Sparkles

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
          <IconComponent className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">{mode.title}</h3>
          <p className="text-sm text-gray-500">{mode.tagline}</p>
          {cohortName && (
            <p className="text-sm text-blue-600 mt-1">Cohort: {cohortName}</p>
          )}
        </div>
      </div>
      
      <p className="text-gray-600 mb-4">{mode.description}</p>
      
      <div className="flex flex-wrap gap-2">
        {mode.features.filter(f => f.available).slice(0, 4).map(feature => (
          <FeatureTag key={feature.id} text={feature.text} />
        ))}
      </div>
    </div>
  )
}
