"use client"

import Link from "next/link"
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { publicCourseApi, CourseListResponse } from "@/lib/api"
import {
  ArrowRight,
  Code2,
  Sparkles,
  Clock,
  BarChart3,
  Lightbulb,
  ChevronDown,
  Star,
  Loader2,
  Menu,
  X,
} from "lucide-react"

const tabs = [
  { id: "top", label: "Top Courses" },
  { id: "ai", label: "AI" },
  { id: "career", label: "Career Tracks" },
  { id: "skill", label: "Skill Tracks" },
]

const footerLinks = {
  programmes: [
    "All Programmes",
    "Data Science",
    "Data Engineering",
    "Data Analytics",
    "AI Career Essentials",
    "Virtual Assistant",
    "Professional Foundations",
    "Graphic Design",
    "Cybersecurity",
  ],
  more: [
    "Content Creation",
    "Freelancer Academy",
    "Founder Academy",
  ],
  about: [
    "Hubs",
    "Learner Voices",
    "Blog",
    "Careers",
  ],
}

const techLogos = [
  {
    name: "Python",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 98 24" width="82"><g fill="currentColor"><path d="M36.82 12.02c0-2.97-.85-4.5-2.56-4.58a4.82 4.82 0 0 0-1.98.33 2.9 2.9 0 0 0-1.04.54v7.1c1.09.68 2.06 1 2.9.94 1.78-.11 2.68-1.56 2.68-4.33zm2.1.13c0 1.5-.36 2.76-1.07 3.76a3.96 3.96 0 0 1-3.32 1.74 5.9 5.9 0 0 1-3.29-1v6.45l-1.83-.65V8.15c.3-.37.69-.69 1.16-.96a7.95 7.95 0 0 1 3.96-.97l.03.03A3.64 3.64 0 0 1 37.84 8a7.37 7.37 0 0 1 1.08 4.16zm11.16 4.23c0 2.02-.2 3.42-.61 4.2a4.3 4.3 0 0 1-2.34 1.87 9 9 0 0 1-3.03.6l-.3-1.15c1.1-.15 1.88-.3 2.32-.44.89-.3 1.5-.76 1.83-1.37.27-.5.4-1.46.4-2.87v-.47a9.42 9.42 0 0 1-3.93.85c-.9 0-1.69-.28-2.37-.85a2.87 2.87 0 0 1-1.15-2.34V6.85l1.82-.62v7.61c0 .81.27 1.44.8 1.88a3 3 0 0 0 2.04.63 5.14 5.14 0 0 0 2.69-.97V6.5h1.83v9.88zm7.13 1.17a7.34 7.34 0 0 1-.6.02 3.6 3.6 0 0 1-2.42-.73 2.54 2.54 0 0 1-.86-2.04V7.64h-1.25V6.5h1.25V3.46l1.82-.64V6.5h2.06v1.14h-2.06v7.11c0 .69.19 1.17.55 1.45.32.23.82.37 1.5.4v.95zm11.05-.15h-1.82v-7.02a3.3 3.3 0 0 0-.5-1.84 1.83 1.83 0 0 0-1.61-.87c-.84 0-1.89.44-3.14 1.32v8.4h-1.83V.64l1.83-.58V7.7A6.38 6.38 0 0 1 65 6.42c.97 0 1.75.33 2.35.97.6.65.9 1.46.9 2.42v7.59zm9.7-5.66c0-1.14-.21-2.09-.64-2.83a2.73 2.73 0 0 0-2.4-1.44c-2 .12-3 1.54-3 4.28a7 7 0 0 0 .62 3.14c.54 1.08 1.34 1.6 2.41 1.59 2.01-.02 3.02-1.6 3.02-4.74zm2 .01c0 1.62-.41 2.98-1.24 4.06a4.5 4.5 0 0 1-3.8 1.81c-1.6 0-2.85-.6-3.76-1.81a6.53 6.53 0 0 1-1.22-4.06c0-1.53.44-2.81 1.32-3.86a4.57 4.57 0 0 1 3.68-1.67c1.52 0 2.75.56 3.7 1.67a5.78 5.78 0 0 1 1.33 3.86zm10.48 5.65H88.6V9.98c0-.81-.25-1.44-.74-1.9a2.69 2.69 0 0 0-1.96-.66c-.87.02-1.7.3-2.48.84v9.14h-1.82V8.04a9.03 9.03 0 0 1 2.9-1.5 8.87 8.87 0 0 1 2.2-.32c.43 0 .84.05 1.22.13.72.17 1.3.47 1.75.92.5.5.76 1.1.76 1.8v8.33zM11.38.7c-.94 0-1.84.08-2.63.22C6.43 1.32 6 2.18 6 3.76v2.09h5.5v.69H3.94c-1.6 0-3 .96-3.43 2.77-.5 2.09-.53 3.39 0 5.56.39 1.62 1.32 2.78 2.92 2.78h1.89v-2.5c0-1.8 1.57-3.4 3.43-3.4h5.5a2.76 2.76 0 0 0 2.74-2.78V3.76c0-1.48-1.26-2.6-2.75-2.84a17.22 17.22 0 0 0-2.86-.23zM8.4 2.36a1.04 1.04 0 0 1 1.03 1.05c0 .57-.47 1.04-1.03 1.04-.57 0-1.03-.47-1.03-1.04 0-.58.46-1.05 1.03-1.05z"></path><path d="M17.68 6.54v2.43c0 1.88-1.6 3.47-3.44 3.47H8.75A2.8 2.8 0 0 0 6 15.22v5.2c0 1.5 1.3 2.36 2.75 2.79 1.74.5 3.41.6 5.5 0 1.37-.4 2.74-1.2 2.74-2.78v-2.09H11.5v-.7h8.24c1.6 0 2.2-1.1 2.75-2.77.57-1.7.55-3.36 0-5.56-.4-1.58-1.15-2.77-2.75-2.77h-2.06zm-3.1 13.2a1.04 1.04 0 0 1 0 2.08 1.04 1.04 0 0 1-1.02-1.05c0-.57.46-1.04 1.03-1.04z"></path></g></svg>`
  },
  {
    name: "R",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22 23" width="19"><g fill="currentColor" fill-rule="evenodd"><path d="M21.78 7.91a5.41 5.41 0 0 0-.31-1.74c-.2-.55-.5-1.06-.84-1.53a7.87 7.87 0 0 0-2.64-2.17 11 11 0 0 0-3.2-1.07 13.7 13.7 0 0 0-6.53.48 11.96 11.96 0 0 0-2.88 1.36 7.88 7.88 0 0 0-2.19 2.08c-.55.8-.85 1.7-.85 2.6 0 .89.3 1.78.85 2.58s1.31 1.51 2.19 2.09a11.88 11.88 0 0 0 2.88 1.36 13.74 13.74 0 0 0 6.54.47c1.1-.2 2.18-.54 3.19-1.07 1-.53 1.93-1.25 2.64-2.17.34-.47.65-.98.84-1.53a5.4 5.4 0 0 0 .31-1.74m0 0c0 1.19-.41 2.36-1.09 3.32a9.1 9.1 0 0 1-2.54 2.4 13.14 13.14 0 0 1-3.2 1.5 15.01 15.01 0 0 1-3.48.65c-2.36.15-4.85-.2-7.09-1.38a9.02 9.02 0 0 1-3-2.5 7 7 0 0 1-1-1.84A6.66 6.66 0 0 1 0 7.9a6.64 6.64 0 0 1 1.38-4 8.21 8.21 0 0 1 1.4-1.43 9.63 9.63 0 0 1 1.6-1.06 13.23 13.23 0 0 1 7.1-1.39c1.18.1 2.35.3 3.48.67a13.15 13.15 0 0 1 3.19 1.48 9.07 9.07 0 0 1 2.54 2.41 5.82 5.82 0 0 1 1.1 3.32"></path><path d="M13.84 12.79c1.44 0 2.32-.83 2.32-2.43 0-1.73-.88-2.23-2.32-2.23h-1.65v4.66h1.65zm-.39 2.88h-1.23v6.71H8.59V5.14h5.95c2.88 0 5.5 1.04 5.5 4.93 0 2.32-1.2 4-3 4.88l4.32 7.43h-4.04l-3.87-6.71z"></path></g></svg>`
  },
  {
    name: "SQL",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 59 20" width="59"><path d="M9.81 15.64a36.88 36.88 0 0 1-7.25-.63A8.28 8.28 0 0 1 0 14.13v3.55c0 1.18 4.4 2.14 9.81 2.14 5.42 0 9.81-.96 9.81-2.14v-3.54a8.28 8.28 0 0 1-2.55.87 36.88 36.88 0 0 1-7.26.63m0-5.59a36.88 36.88 0 0 1-7.25-.63A8.28 8.28 0 0 1 0 8.55v3.42h.06c0 .6 3.43 1.76 9.75 1.76 6.33 0 9.75-1.17 9.75-1.77h.06v-3.4c-.8.42-1.67.72-2.56.87a36.86 36.86 0 0 1-7.25.62m9.81-7.91C19.62.96 15.22 0 9.82 0S0 .96 0 2.14a.47.47 0 0 0 0 .07.47.47 0 0 0 0 .07v3.88h.06c0 .6 3.43 1.76 9.75 1.76 6.33 0 9.75-1.17 9.75-1.77h.06V2.27a.47.47 0 0 0 0-.07.5.5 0 0 0 0-.06" fill="currentColor" fill-rule="evenodd"></path></svg>`
  },
  {
    name: "ChatGPT",
    svg: `<svg fill="currentColor" height="24" viewBox="0 0 128 34" xmlns="http://www.w3.org/2000/svg" width="91"><g clip-path="url(#chat-gpt_svg__a)"><g clip-path="url(#chat-gpt_svg__b)"><path d="M30.71 14.1a7.98 7.98 0 0 0-.69-6.55 8.06 8.06 0 0 0-8.68-3.87 8.09 8.09 0 0 0-13.7 2.9 7.98 7.98 0 0 0-5.33 3.86 8.06 8.06 0 0 0 1 9.46 7.97 7.97 0 0 0 .67 6.55 8.07 8.07 0 0 0 8.69 3.87A7.98 7.98 0 0 0 18.68 33a8.07 8.07 0 0 0 7.7-5.6 7.99 7.99 0 0 0 5.33-3.87 8.08 8.08 0 0 0-1-9.44zM18.68 30.9c-1.4 0-2.76-.48-3.83-1.38l.18-.1 6.38-3.69a1.06 1.06 0 0 0 .52-.9v-8.99l2.7 1.56a.1.1 0 0 1 .04.07v7.44a6 6 0 0 1-5.99 6zM5.8 25.4a5.96 5.96 0 0 1-.71-4.01l.19.11 6.37 3.68a1.03 1.03 0 0 0 1.04 0l7.8-4.5v3.12a.1.1 0 0 1-.05.08L14 27.6a6 6 0 0 1-8.19-2.2zM4.12 11.54A5.98 5.98 0 0 1 7.28 8.9v7.57a1.02 1.02 0 0 0 .51.9l7.76 4.47-2.7 1.56a.1.1 0 0 1-.1 0l-6.43-3.72a6 6 0 0 1-2.2-8.18zm22.13 5.14-7.78-4.52 2.69-1.55a.1.1 0 0 1 .1 0l6.43 3.72a6 6 0 0 1-.9 10.8v-7.56a1.05 1.05 0 0 0-.54-.9zm2.68-4.03-.19-.12-6.36-3.7a1.04 1.04 0 0 0-1.05 0l-7.78 4.49V10.2a.09.09 0 0 1 .03-.09l6.44-3.71a6 6 0 0 1 8.91 6.21zm-16.85 5.51-2.7-1.55a.1.1 0 0 1-.05-.08V9.1a6 6 0 0 1 9.84-4.6l-.2.1-6.36 3.68a1.06 1.06 0 0 0-.53.9zM13.54 15l3.47-2 3.48 2v4l-3.47 2-3.47-2z"></path></g><path d="M43.95 7.79c2 0 3.54.53 4.65 1.58a5.58 5.58 0 0 1 1.83 3.59h-2.08a4.32 4.32 0 0 0-1.42-2.42c-.7-.6-1.69-.9-2.96-.9-1.56 0-2.81.56-3.77 1.65-.96 1.1-1.43 2.76-1.43 5.02 0 1.85.43 3.35 1.29 4.5.86 1.15 2.15 1.72 3.86 1.72 1.58 0 2.78-.6 3.6-1.82a6.9 6.9 0 0 0 .98-2.51h2.08a7.12 7.12 0 0 1-1.84 4.18 6.57 6.57 0 0 1-5.07 2.03 6.7 6.7 0 0 1-4.62-1.67c-1.64-1.46-2.46-3.73-2.46-6.8 0-2.32.61-4.23 1.84-5.72a6.75 6.75 0 0 1 5.52-2.43zm8.99.38h1.93v5.88c.46-.58.87-.99 1.24-1.22.62-.41 1.4-.61 2.33-.61 1.67 0 2.8.58 3.4 1.75.31.63.47 1.52.47 2.65V24h-1.98v-7.25c0-.85-.11-1.47-.33-1.86-.35-.63-1-.94-1.97-.94-.8 0-1.53.27-2.18.82-.65.55-.98 1.6-.98 3.13V24h-1.93zm13.73 12.77c0 .56.2 1 .6 1.32.42.32.9.48 1.46.48a4.4 4.4 0 0 0 1.97-.47 2.66 2.66 0 0 0 1.62-2.57v-1.55a3.3 3.3 0 0 1-.92.37c-.37.1-.74.17-1.1.22l-1.16.15c-.7.09-1.23.24-1.58.44-.6.33-.9.87-.9 1.6zm4.68-3.91c.44-.06.74-.25.89-.56.09-.17.13-.42.13-.74 0-.66-.24-1.14-.71-1.43a3.71 3.71 0 0 0-2-.45c-1.02 0-1.73.27-2.16.82-.23.3-.39.74-.46 1.34h-1.8c.03-1.42.5-2.4 1.37-2.96a5.67 5.67 0 0 1 3.08-.83c1.36 0 2.46.25 3.3.77.84.51 1.26 1.32 1.26 2.4v6.63c0 .2.04.37.12.49.08.12.26.18.52.18a4.38 4.38 0 0 0 .64-.06v1.42c-.3.09-.53.14-.69.16-.16.03-.37.04-.64.04-.67 0-1.15-.24-1.45-.71-.16-.25-.27-.6-.34-1.07a5.25 5.25 0 0 1-4.14 1.91 3.66 3.66 0 0 1-2.61-.96 3.25 3.25 0 0 1-1.01-2.44c0-1.07.33-1.9 1-2.48s1.53-.95 2.62-1.08zm6.47-7.75h1.95v3.22h1.84v1.57h-1.84v7.51c0 .4.14.67.4.8.16.09.41.13.76.13h.3l.38-.04V24a6.44 6.44 0 0 1-1.47.18c-.9 0-1.52-.23-1.84-.68a3.1 3.1 0 0 1-.48-1.81v-7.62h-1.56V12.5h1.56z"></path></g></svg>`
  },
  {
    name: "Excel",
    svg: `<svg viewBox="0 0 81 32" xmlns="http://www.w3.org/2000/svg" width="62"><g fill="currentColor"><path d="M19.24 0v2.89l10.97-.01c.62.02 1.3-.02 1.84.34.37.54.33 1.21.36 1.83-.02 6.26-.02 12.52-.01 18.78-.02 1.05.1 2.12-.13 3.16-.14.75-1.06.76-1.67.79H19.24v3.25h-2.27c-5.56-1-11.14-1.93-16.72-2.9V2.9L11.47.97l5.6-.97zM31.3 3.97H19.24v2.16h2.92v2.53h-2.92v1.44h2.92v2.53h-2.92v1.44h2.92v2.52h-2.92v1.45h2.92v2.52h-2.92v1.45h2.92v2.52h-2.92v2.17H31.3zM28.74 22v2.52h-5.11v-2.52zM13.56 9.37l-2.49.14c-.61 1.49-1.33 2.93-1.82 4.46-.45-1.45-1.04-2.84-1.59-4.25l-2.4.14C6.1 11.7 7 13.53 7.82 15.39c-.97 1.8-1.88 3.63-2.82 5.44.8.04 1.6.07 2.4.08.57-1.44 1.28-2.82 1.78-4.28.44 1.57 1.2 3.02 1.82 4.53l2.64.16c-1-2.02-2.04-4.02-3.04-6.04 1-1.97 1.97-3.94 2.95-5.92zm15.18 8.67v2.52h-5.11v-2.52zm0-3.97v2.53h-5.11v-2.53zm0-3.97v2.53h-5.11V10.1zm0-3.97v2.53h-5.11V6.13z"></path></g></svg>`
  },
  {
    name: "Docker",
    svg: `<svg aria-hidden="true" viewBox="0 0 105 28" width="75"><path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M17.34 4.03h3.33a.3.3 0 0 0 .3-.3V.77a.3.3 0 0 0-.3-.3h-3.33a.3.3 0 0 0-.3.3v2.98a.3.3 0 0 0 .3.3zM11.4 8.3H8.07c-.16 0-.28-.14-.3-.3V5.04c0-.17.14-.3.3-.3h3.32c.18 0 .3.14.3.3v2.98a.3.3 0 0 1-.3.3zm25.97 2.4c-.1-.09-1.05-.8-3.08-.8-.52 0-1.06.05-1.59.14-.36-2.5-2.32-3.8-2.65-4.02l-.35.5a7.45 7.45 0 0 0-.97 2.25 5.32 5.32 0 0 0 .63 4.18c-.92.52-2.43.65-2.74.66H1.17c-.64 0-1.17.53-1.17 1.18a17.7 17.7 0 0 0 1.09 6.38 9.58 9.58 0 0 0 3.78 4.92c1.85 1.14 4.88 1.78 8.3 1.78 1.53 0 3.07-.14 4.6-.42a19.02 19.02 0 0 0 6.02-2.18 16.48 16.48 0 0 0 4.09-3.36 22.27 22.27 0 0 0 4-6.91h.36c2.15 0 3.48-.86 4.21-1.6a4.67 4.67 0 0 0 1.12-1.64l-.37-.26zM6.8 12.56H3.49c-.16 0-.29-.13-.3-.3V9.28c0-.17.14-.3.3-.3H6.8c.17 0 .3.15.3.3v2.98a.3.3 0 0 1-.3.3zm1.26 0h3.32a.3.3 0 0 0 .3-.3V9.28a.3.3 0 0 0-.3-.3H8.07a.3.3 0 0 0-.3.3v2.98c.02.17.14.3.3.3zm8 0h-3.33a.28.28 0 0 1-.3-.3V9.28c0-.17.14-.3.3-.3h3.33c.17 0 .3.15.3.3v2.98a.3.3 0 0 1-.3.3zm1.27 0h3.33a.3.3 0 0 0 .3-.3V9.28a.3.3 0 0 0-.3-.3h-3.33a.3.3 0 0 0-.3.3v2.98a.3.3 0 0 0 .3.3zm-4.6-4.26h3.33a.3.3 0 0 0 .3-.3V5.04a.3.3 0 0 0-.3-.3h-3.33a.3.3 0 0 0-.3.3v2.98c0 .15.13.3.3.3zm7.93 0h-3.33a.3.3 0 0 1-.3-.3V5.04c0-.17.15-.3.3-.3h3.33c.16 0 .3.14.3.3v2.98a.3.3 0 0 1-.3.3zm4.64 4.26h-3.33c-.16 0-.28-.13-.3-.3V9.28c0-.17.14-.3.3-.3h3.33c.17 0 .3.15.3.3v2.98a.3.3 0 0 1-.3.3z"></path></svg>`
  },
  {
    name: "Snowflake",
    svg: `<svg aria-hidden="true" viewBox="0 0 85 25" width="100"><path fill-rule="evenodd" clip-rule="evenodd" d="M65.8 15.9a2.67 2.67 0 0 0 1.82.88 2.66 2.66 0 0 0 2.52-2.8 2.53 2.53 0 1 0-5.03 0 2.67 2.67 0 0 0 .68 1.92Zm4.3-4.08.04.05v-1.03a.33.33 0 1 1 .66 0v6.29a.33.33 0 0 1-.5.3.33.33 0 0 1-.16-.3V16.1l-.03.05-.03.03a3.08 3.08 0 0 1-2.45 1.3 3.35 3.35 0 0 1-3.18-3.5 3.34 3.34 0 0 1 3.18-3.47 3.07 3.07 0 0 1 2.45 1.28l.02.03Zm2.88 2.73.02-.02.04-.05 3.9-3.95a.3.3 0 0 1 .47 0 .34.34 0 0 1 0 .48l-2.58 2.6 2.6 3.27a.37.37 0 0 1-.03.5.34.34 0 0 1-.22.07.28.28 0 0 1-.26-.13l-2.53-3.17-.04-.05-1.37 1.42v1.6a.34.34 0 0 1-.33.34.33.33 0 0 1-.34-.34V7.87a.34.34 0 0 1 .34-.35.33.33 0 0 1 .33.35v6.68ZM62.6 7.63a.34.34 0 0 1 .24-.1v-.01c.18 0 .34.15.34.34v9.25a.34.34 0 0 1-.63.18.33.33 0 0 1-.04-.18V7.87a.34.34 0 0 1 .1-.24Zm-8.47 8.59v-.02l.04-.07 1.9-5.42a.33.33 0 0 1 .43-.18c.16.08.24.27.18.44l-2.23 6.23a.44.44 0 0 1-.13.17.27.27 0 0 1-.19.07h-.04a.36.36 0 0 1-.27-.23l-1.57-3.83-1.54 3.83a.05.05 0 0 0-.01.03.32.32 0 0 1-.29.21.39.39 0 0 1-.12-.02.07.07 0 0 1-.06-.03.26.26 0 0 1-.13-.16l-2.25-6.26a.35.35 0 0 1 .17-.44.32.32 0 0 1 .35.08l.07.1 1.95 5.5v.03l1.55-3.82a.36.36 0 0 1 .31-.21.36.36 0 0 1 .33.21l1.5 3.72.04.07v.02l.01-.02ZM34.6 10.56a.32.32 0 0 1 .15.3v.66a2.68 2.68 0 0 1 2.08-1.01 2.78 2.78 0 0 1 2.72 2.82v3.78a.33.33 0 1 1-.66 0v-3.78a2.1 2.1 0 0 0-2.06-2.14 2.14 2.14 0 0 0-2.08 2.14v3.83a.33.33 0 0 1-.07.16.3.3 0 0 1-.24.13h-.09a.36.36 0 0 1-.22-.19.06.06 0 0 1 0-.04.05.05 0 0 0-.02-.03v-6.34a.32.32 0 0 1 .15-.3.32.32 0 0 1 .34 0Zm7.5 5.32c.46.53 1.12.84 1.82.89a2.68 2.68 0 0 0 2.52-2.8 2.53 2.53 0 1 0-5.03 0c-.03.7.21 1.4.68 1.91Zm-.47-4.3a3.36 3.36 0 0 1 2.3-1.08v-.01a3.36 3.36 0 0 1 3.17 3.48 3.19 3.19 0 0 1-4.85 3 3.18 3.18 0 0 1-1.5-3 3.36 3.36 0 0 1 .88-2.38ZM8.45 9.04 3.38 5.98a1.58 1.58 0 0 1-.55-2.12 1.46 1.46 0 0 1 2.04-.56l2.88 1.73V1.55A1.49 1.49 0 0 1 10 .22a1.49 1.49 0 0 1 .72 1.33v6.1a1.57 1.57 0 0 1-.48 1.14 1.45 1.45 0 0 1-1.79.24Zm12.2-3.06-5.07 3.05a1.46 1.46 0 0 1-2.04-.57 1.58 1.58 0 0 1-.2-.92V1.54a1.49 1.49 0 1 1 2.98 0V5l2.85-1.71a1.46 1.46 0 0 1 2.03.57 1.58 1.58 0 0 1-.54 2.11Zm-9.48 6.25a.44.44 0 0 0-.11.27v.02a.45.45 0 0 0 .1.27l.6.61a.41.41 0 0 0 .26.11h.02a.42.42 0 0 0 .26-.1l.59-.62a.44.44 0 0 0 .1-.27v-.02a.44.44 0 0 0-.1-.27l-.6-.62a.41.41 0 0 0-.25-.1h-.02a.43.43 0 0 0-.26.1l-.6.62Zm-1.9.55v-.54a.59.59 0 0 1 .14-.36l2.01-2.09a.56.56 0 0 1 .35-.15h.51c.13 0 .26.06.35.15l2.02 2.09c.09.1.14.23.14.36v.54a.6.6 0 0 1-.14.36l-2.02 2.09a.56.56 0 0 1-.35.15h-.5a.56.56 0 0 1-.36-.15l-2.01-2.09a.6.6 0 0 1-.15-.36Zm-5.65-.25L.75 10.8A1.58 1.58 0 0 1 .2 8.68a1.46 1.46 0 0 1 2.04-.57l5.08 3.05a1.62 1.62 0 0 1 0 2.72l-5.08 3.05a1.46 1.46 0 0 1-2.04-.57 1.58 1.58 0 0 1 .55-2.11l2.87-1.73Zm12.35 0a1.56 1.56 0 0 0 .74 1.36l5.08 3.04a1.46 1.46 0 0 0 2.04-.56 1.58 1.58 0 0 0-.54-2.12l-2.88-1.72 2.88-1.73a1.58 1.58 0 0 0 .54-2.12 1.46 1.46 0 0 0-2.04-.56l-5.08 3.04a1.56 1.56 0 0 0-.74 1.37Zm-7.52 3.49a1.44 1.44 0 0 1 1.02-.18 1.52 1.52 0 0 1 1.25 1.52v6.1a1.49 1.49 0 1 1-2.97 0v-3.44l-2.88 1.73a1.46 1.46 0 0 1-2.04-.57 1.58 1.58 0 0 1 .54-2.11L8.45 16Zm7.13 0 5.08 3.04c.72.44.96 1.38.55 2.11a1.46 1.46 0 0 1-2.04.57l-2.85-1.7v3.42a1.49 1.49 0 1 1-2.97 0V17.5a1.6 1.6 0 0 1 .57-1.38 1.46 1.46 0 0 1 1.66-.12Zm63.2-2.64v.07h5.06v-.05l-.01-.02a2.61 2.61 0 0 0-2.5-2.18 2.64 2.64 0 0 0-2.55 2.18Zm-.05.74v.06h-.01a2.68 2.68 0 0 0 2.57 2.6h.31a2.66 2.66 0 0 0 2.17-1.41.3.3 0 0 1 .2-.15.32.32 0 0 1 .24.04.37.37 0 0 1 .1.48 3.32 3.32 0 0 1-2.7 1.73h-.3a3.37 3.37 0 0 1-3.24-3.47 3.24 3.24 0 0 1 3.12-3.48 3.25 3.25 0 0 1 3.36 3.24v.05a.31.31 0 0 1-.33.3h-5.5ZM58.9 9.67a2.4 2.4 0 0 1 .44-1.61 1.66 1.66 0 0 1 1.37-.5.4.4 0 0 1 .05 0h.1a.35.35 0 0 1 .24.59.35.35 0 0 1-.24.1h-.1a.29.29 0 0 1-.05 0 .21.21 0 0 1-.04 0 1.03 1.03 0 0 0-.84.27 1.88 1.88 0 0 0-.27 1.15v.74h.94a.32.32 0 0 1 .24.1c.06.06.1.14.1.23a.36.36 0 0 1-.34.37h-.95v6.03a.33.33 0 0 1-.33.35.32.32 0 0 1-.32-.35V11.1h-.88a.36.36 0 0 1-.34-.37.33.33 0 0 1 .34-.33h.88v-.74Zm-28.7 3.74.25.08.2.07c1.09.38 2.09.72 2.09 1.95a1.83 1.83 0 0 1-.73 1.44 2.64 2.64 0 0 1-1.67.51 3.58 3.58 0 0 1-1.4-.32c-.67-.34-1.04-.68-.76-.95.12-.12.26-.03.49.1.32.2.81.5 1.68.5.52 0 1.68-.3 1.67-1.28 0-.7-.85-1-1.57-1.25a7.63 7.63 0 0 0-.37-.12c-.8-.23-2.03-.58-2-1.8a1.54 1.54 0 0 1 .73-1.38 2.8 2.8 0 0 1 1.64-.45c.94 0 2.25 1.06 1.88 1.39-.16.14-.3.02-.52-.16-.29-.25-.7-.6-1.46-.6-.53 0-1.54.35-1.54 1.2 0 .6.68.83 1.39 1.07Z" fill="currentColor"></path></svg>`
  },
  {
    name: "Azure",
    svg: `<svg aria-hidden="true" viewBox="0 0 78 23" width="68"><path d="m13.42 21.65 6.84-1.2.07-.02-3.52-4.19a601.1 601.1 0 0 1-3.52-4.2l3.65-10.06c.01-.02 2.48 4.25 6 10.35a105879 105879 0 0 1 6.03 10.44l.04.08H6.64l6.78-1.2Zm42.89-1.01c-1.7-.1-2.7-1.08-2.95-2.9-.07-.47-.07-.49-.08-3.62v-3.03h1.5v2.93c0 2.64.01 2.95.04 3.14.1.75.3 1.26.65 1.63.28.29.6.46 1.06.55.21.04.81.04 1 0 .47-.1.83-.3 1.16-.62.37-.37.64-.9.77-1.49l.04-.2v-2.95l.01-2.96h1.54v9.3h-1.52v-.74c0-.5 0-.73-.02-.73a.6.6 0 0 0-.08.13 3.1 3.1 0 0 1-3.12 1.56Zm17.28 0a3.99 3.99 0 0 1-1.75-.58c-1.1-.67-1.74-1.78-1.93-3.31a8.02 8.02 0 0 1-.01-1.7c.12-1 .51-1.99 1.07-2.69.15-.18.48-.5.66-.65a4.06 4.06 0 0 1 1.66-.8 5.4 5.4 0 0 1 1.35-.07c.94.08 1.8.53 2.39 1.22.6.71.92 1.7.96 2.92v1.15h-6.6v.15c0 .45.11.96.3 1.4.16.37.44.78.67.97.47.41 1.05.65 1.67.71.24.02.83 0 1.1-.04a4.63 4.63 0 0 0 2.06-.85 5.07 5.07 0 0 1 .14-.1c.02-.02.02.12.02.68v.7l-.15.1a5.46 5.46 0 0 1-2.21.76c-.24.03-1.12.04-1.4.02Zm2.87-5.91a3 3 0 0 0-.76-2.02 2.1 2.1 0 0 0-1.17-.56 3.44 3.44 0 0 0-.9.03c-.49.1-.89.3-1.24.65a3.36 3.36 0 0 0-.81 1.3 4.17 4.17 0 0 0-.16.65l-.01.08h5.05v-.13ZM31.73 20.4l2.49-6.54 2.48-6.51h1.6l.06.17 4.97 12.9h-1.7l-.69-1.83-.68-1.83h-5.53l-.03.06-.65 1.83-.63 1.77h-.85c-.67 0-.85 0-.84-.02Zm8.02-5.03-1.02-2.79c-1.06-2.86-1.12-3.03-1.2-3.49-.04-.21-.06-.22-.09-.02a4.51 4.51 0 0 1-.14.63 416.83 416.83 0 0 1-1.06 2.9 444.11 444.11 0 0 0-1 2.76l2.25.01h2.26Zm4.09 4.81v-.24l2.76-3.78 2.75-3.8h-4.99v-1.27h7.2v.42l-2.75 3.81a1221.09 1221.09 0 0 0-2.75 3.82h5.44v1.28h-7.66v-.24Zm20.22.23-.01-4.67V11.1h1.5v.96c0 .52 0 .96.02.96a.86.86 0 0 0 .08-.2c.17-.48.46-.93.84-1.3a2.17 2.17 0 0 1 1.69-.6c.32 0 .49.03.69.1l.06.02v1.56l-.18-.1a1.9 1.9 0 0 0-1-.2 1.89 1.89 0 0 0-1.54.9 4.5 4.5 0 0 0-.63 1.81c-.01.11-.02 1.01-.02 2.8v2.62h-.75l-.75-.01ZM0 20.38l3.69-6.4L7.37 7.6l4.3-3.6 4.3-3.6a.75.75 0 0 1-.07.17l-4.66 10-4.58 9.82H0Z" fill="currentColor"></path></svg>`
  },
  {
    name: "Git",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 49 21" width="40"><path fill="currentColor" fill-rule="evenodd" d="M28.9 6.73c-1.05 0-1.84.52-1.84 1.76 0 .94.52 1.59 1.8 1.59 1.07 0 1.8-.63 1.8-1.63 0-1.13-.66-1.72-1.75-1.72zm-2.1 8.79c-.26.3-.5.63-.5 1 0 .77.97 1 2.32 1 1.11 0 2.63-.07 2.63-1.1 0-.62-.73-.66-1.65-.72l-2.8-.18zm5.68-8.73c.35.44.72 1.05.72 1.93 0 2.12-1.68 3.37-4.1 3.37-.61 0-1.17-.08-1.52-.17l-.63 1.01 1.88.12c3.33.2 5.29.3 5.29 2.85 0 2.2-1.94 3.44-5.29 3.44-3.48 0-4.8-.88-4.8-2.4 0-.85.38-1.31 1.05-1.94a1.28 1.28 0 0 1-.84-1.27c0-.42.2-.8.55-1.16.35-.37.73-.73 1.2-1.15a3.05 3.05 0 0 1-1.66-2.87c0-2.2 1.46-3.71 4.4-3.71.83 0 1.33.07 1.78.19h3.75v1.62l-1.77.14zm5.08-3.37c-1.07 0-1.68-.64-1.68-1.73 0-1.1.61-1.69 1.68-1.69 1.09 0 1.7.6 1.7 1.69 0 1.1-.61 1.73-1.7 1.73zm-2.42 11.53v-1.52l.96-.13c.26-.04.3-.1.3-.39V7.27c0-.2-.06-.34-.24-.4l-1.01-.37.2-1.55h3.88v7.96c0 .31.02.35.3.39l.95.13v1.51h-5.33zm13.35-.77c-.85.4-2.1.77-3.22.77-2.36 0-3.24-.93-3.24-3.1V6.8c0-.11 0-.19-.16-.19h-1.39V4.9c1.74-.2 2.44-1.04 2.65-3.14h1.88v2.73c0 .14 0 .2.16.2h2.79V6.6H45v4.6c0 1.14.28 1.58 1.34 1.58.56 0 1.13-.14 1.6-.3l.54 1.69M20.08 9.2 11.14.38a1.33 1.33 0 0 0-1.86 0L7.42 2.21l2.36 2.33a1.58 1.58 0 0 1 1.6.37c.45.43.57 1.06.38 1.6l2.27 2.24a1.58 1.58 0 0 1 1.62.37 1.54 1.54 0 0 1 0 2.2 1.58 1.58 0 0 1-2.22 0 1.54 1.54 0 0 1-.34-1.7l-2.12-2.08v5.5a1.54 1.54 0 0 1 .42 2.48 1.58 1.58 0 0 1-2.22 0 1.54 1.54 0 0 1 0-2.19c.15-.15.33-.26.51-.34V7.44a1.55 1.55 0 0 1-.85-2.03L6.51 3.1.4 9.18a1.3 1.3 0 0 0 0 1.84l8.93 8.83a1.33 1.33 0 0 0 1.87 0l8.89-8.79a1.3 1.3 0 0 0 0-1.84"></path></svg>`
  }
]

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Fetch courses from the public API
  const { data: courses = [], isLoading: isLoadingCourses } = useQuery({
    queryKey: ["public", "courses"],
    queryFn: () => publicCourseApi.listCourses({ limit: 6 }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Helper to get difficulty level label
  const getDifficultyLabel = (level: string) => {
    switch (level) {
      case "BEGINNER": return "Basic"
      case "INTERMEDIATE": return "Intermediate"
      case "ADVANCED": return "Advanced"
      default: return level
    }
  }

  return (
    <div className="min-h-screen bg-[#1a1f2e] text-white font-sans selection:bg-blue-500/30 overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-[#1a1f2e]/95 backdrop-blur-md border-b border-white/5">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="bg-blue-600 p-1.5 rounded-lg">
                <Code2 className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">LearnTech</span>
            </Link>
            <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-300">
              <a href="#courses" className="hover:text-white transition-colors">
                Courses
              </a>
              <a href="#ai-features" className="hover:text-white transition-colors">
                AI Features
              </a>
              <a href="#" className="hover:text-white transition-colors">
                Internship
              </a>
              <a href="#" className="hover:text-white transition-colors">
                Services
              </a>
              <a href="#" className="hover:text-white transition-colors">
                Contact Us
              </a>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link 
              href="/login" 
              className="hidden md:inline-block text-sm font-medium text-gray-300 hover:text-white transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/dashboard"
              className="hidden md:inline-block px-4 py-2 bg-white hover:bg-gray-100 text-gray-900 text-sm font-semibold rounded-lg transition-all"
            >
              Get Started
            </Link>
            <button
              className="md:hidden p-2 text-gray-300 hover:text-white transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/5 bg-[#1a1f2e]/95 backdrop-blur-md">
            <div className="flex flex-col px-6 py-4 gap-1">
              <a href="#courses" onClick={() => setMobileMenuOpen(false)} className="py-3 text-sm font-medium text-gray-300 hover:text-white transition-colors">
                Courses
              </a>
              <a href="#ai-features" onClick={() => setMobileMenuOpen(false)} className="py-3 text-sm font-medium text-gray-300 hover:text-white transition-colors">
                AI Features
              </a>
              <a href="#" onClick={() => setMobileMenuOpen(false)} className="py-3 text-sm font-medium text-gray-300 hover:text-white transition-colors">
                Internship
              </a>
              <a href="#" onClick={() => setMobileMenuOpen(false)} className="py-3 text-sm font-medium text-gray-300 hover:text-white transition-colors">
                Services
              </a>
              <a href="#" onClick={() => setMobileMenuOpen(false)} className="py-3 text-sm font-medium text-gray-300 hover:text-white transition-colors">
                Contact Us
              </a>
              <div className="flex flex-col gap-3 pt-4 mt-2 border-t border-white/10">
                <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium text-gray-300 hover:text-white transition-colors text-center py-2">
                  Log in
                </Link>
                <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className="px-4 py-2.5 bg-white hover:bg-gray-100 text-gray-900 text-sm font-semibold rounded-lg transition-all text-center">
                  Get Started
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-24 overflow-hidden relative min-h-[80vh] flex items-center"
        style={{backgroundImage: `url('/bg_hero.png')`}}
      >
        {/* Grid background */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
            backgroundSize: '80px 80px'
          }} />
        </div>
        
        <div className="container mx-auto px-6 relative">
          <div className="max-w-3xl space-y-6">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.15] text-white">
              Learn data and AI skills
            </h1>
            
            <p className="text-base text-gray-400 leading-relaxed max-w-xl">
              Master in-demand skills in Python, ChatGPT, Power BI, and more through interactive courses, real-world projects, and industry recognized certifications
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Link
                href="/signup"
                className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
              >
                Start Learning for Free
              </Link>
              <Link
                href="/courses"
                className="px-8 py-4 bg-transparent hover:bg-white/5 text-white border border-white/30 font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
              >
                LearnTech for Business
              </Link>
            </div>
            
            {/* Rating Badge */}
            <div className="flex items-center gap-2 pt-2">
              <div className="flex items-center gap-1.5">
                <span className="text-white font-semibold text-sm">4.8</span>
                <div className="flex items-center">
                  {[1, 2, 3, 4].map((i) => (
                    <Star key={i} className="w-4 h-4 fill-gray-400 text-gray-400 gap-4" />
                  ))}
                  <Star className="w-4 h-4 fill-gray-400/50 text-gray-400" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Tech Logos Section */}
      <section className="py-8 border-y border-white/5 bg-[#151923]">
        <div className="container mx-auto px-6">
          <div className="flex flex-wrap lg:flex-nowrap justify-center items-center gap-2">
            {techLogos.map((logo, i) => (
              <div 
                key={i} 
                className="text-gray-500 hover:text-gray-300 transition-colors [&_svg]:h-6 [&_svg]:w-auto"
                dangerouslySetInnerHTML={{ __html: logo.svg }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Courses Section */}
      <section id="courses" className="py-24 bg-white text-gray-900">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">A path for every goal</h2>
          </div>
          
          {/* Tabs */}
          <div className="flex flex-wrap justify-center gap-3 mb-12">
            {tabs.map((tab, i) => (
              <button
                key={tab.id}
                className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all ${
                  i === 0
                    ? "bg-gray-900 text-white"
                    : "bg-white text-gray-700 border border-gray-200 hover:border-gray-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
            <button className="px-6 py-2.5 rounded-full text-sm font-medium bg-white text-gray-700 border border-gray-200 hover:border-gray-300 flex items-center gap-2">
              Explore Catalog
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          
          {/* Course Cards */}
          {isLoadingCourses ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              <span className="ml-3 text-gray-500">Loading courses...</span>
            </div>
          ) : courses.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-500">No courses available at the moment.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course, i) => (
                <div
                  key={course.course_id}
                  className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-gray-300 transition-all group relative overflow-hidden"
                >
                  {/* Colored bottom border */}
                  <div className={`absolute bottom-0 left-0 right-0 h-1 ${
                    i % 3 === 0 ? 'bg-cyan-500' : i % 3 === 1 ? 'bg-blue-500' : 'bg-purple-500'
                  }`} />
                  
                  <h3 className="text-lg font-bold mb-3 text-gray-900">{course.title}</h3>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                    <div className="flex items-center gap-1.5">
                      <BarChart3 className="w-4 h-4" />
                      {getDifficultyLabel(course.difficulty_level)}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      {course.estimated_hours} hr
                    </div>
                  </div>
                  
                  <p className="text-gray-600 text-sm leading-relaxed mb-6 line-clamp-3">
                    {course.description}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <Link
                      href={`/courses/${course.slug}`}
                      className="ml-auto inline-flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 group-hover:gap-3 transition-all"
                    >
                      See Details
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Impact Stats Section */}
      <section className="py-20 bg-[#e8f4f8]">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-[#1a365d] mb-16">
            More Opportunity. More Impact.
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {/* Stat Card 1 */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-3xl font-bold text-[#1a365d] mb-2">285K +</div>
                  <div className="text-gray-600 text-sm">LearnTech Learners<br />Since 2021</div>
                </div>
                <div className="p-3 bg-blue-50 rounded-full">
                  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                  </svg>
                </div>
              </div>
            </div>
            
            {/* Stat Card 2 */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-3xl font-bold text-[#1a365d] mb-2">73,445</div>
                  <div className="text-gray-600 text-sm">Found Work<br />Opportunities</div>
                </div>
                <div className="p-3 bg-blue-50 rounded-full">
                  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>
            
            {/* Stat Card 3 */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-3xl font-bold text-[#1a365d] mb-2">20,248</div>
                  <div className="text-gray-600 text-sm">Young Entrepreneurs<br />Supported</div>
                </div>
                <div className="p-3 bg-blue-50 rounded-full">
                  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
              </div>
            </div>
            
            {/* Stat Card 4 */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-3xl font-bold text-[#1a365d] mb-2">11,452</div>
                  <div className="text-gray-600 text-sm">Jobs Created<br />Through Entrepreneurship</div>
                </div>
                <div className="p-3 bg-blue-50 rounded-full">
                  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
          
          {/* Company Logos */}
          <div className="text-center">
            <p className="text-[#1a365d] font-medium mb-8">Explore the Companies Investing in our Talent</p>
            <div className="flex flex-wrap justify-center items-center gap-8">
              <div className="bg-white px-6 py-3 rounded-lg shadow-sm">
                <span className="font-bold text-green-600">PAY</span><span className="font-bold text-gray-800">TECH</span>
              </div>
              <div className="bg-white px-6 py-3 rounded-lg shadow-sm text-gray-600 text-sm">
                <span className="font-medium">Steven Eagell Toyota</span>
              </div>
              <div className="bg-white px-6 py-3 rounded-lg shadow-sm">
                <span className="font-bold text-blue-600">XMAP</span>
              </div>
              <div className="bg-white px-6 py-3 rounded-lg shadow-sm">
                <span className="font-bold text-red-500">HUAWEI</span>
              </div>
              <div className="bg-white px-6 py-3 rounded-lg shadow-sm">
                <span className="font-bold text-green-500">nabo</span>
              </div>
              <div className="bg-white px-6 py-3 rounded-lg shadow-sm">
                <span className="font-bold text-green-600">faiba</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI-Powered Interactive Learning Section */}
      <section id="ai-features" className="py-24 bg-[#1a1f2e]">
        <div className="container mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            {/* Left Content */}
            <div className="lg:w-1/2 space-y-6">
              <h2 className="text-3xl lg:text-4xl font-bold tracking-tight leading-[1.1] text-white">
                AI-powered interactive<br />
                learning that works for you
              </h2>
              
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">
                  Never get stuck with AI
                </h3>
                <p className="text-base text-gray-400 leading-relaxed max-w-lg">
                  From tailored career advice to instant feedback and code explanation, learn smarter with built-in AI support at every step of your journey.
                </p>
              </div>
              
              <div className="pt-4">
                <Link
                  href="/signup"
                  className="inline-flex px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-all items-center gap-2 group"
                >
                  Start Learning for Free
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
            
            {/* Right - AI Code Hint Card */}
            <div className="lg:w-1/2 relative">
              <div className="absolute -top-8 -right-8 z-10">
                <button className="flex items-center gap-2 px-4 py-2 bg-white text-gray-900 rounded-lg shadow-xl font-medium text-sm hover:bg-gray-50 transition-all">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  Get AI Help
                </button>
              </div>
              
              <div className="relative rounded-2xl bg-[#242938] border border-white/10 overflow-hidden shadow-2xl">
                <div className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-white/10">
                      <Lightbulb className="w-5 h-5 text-gray-400" />
                    </div>
                    <span className="font-semibold text-white">AI Generated Hint</span>
                  </div>
                  
                  <p className="text-gray-400">
                    Have you remembered to create the list <code className="px-1.5 py-0.5 bg-white/10 rounded text-sm">areas</code> using the predefined variables and then print it?
                  </p>
                  
                  <div className="rounded-xl bg-[#1a1f2e] p-4 font-mono text-sm overflow-x-auto">
                    <div className="text-emerald-400"># Create list areas</div>
                    <div className="text-white">areas = [hall, kit, liv, bed, bath]</div>
                    <div className="mt-4 text-emerald-400"># Print areas</div>
                    <div className="text-cyan-400">print<span className="text-white">(areas)</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-16 bg-[#151923]">
        <div className="container mx-auto px-6">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 p-8 rounded-2xl bg-gradient-to-r from-purple-600 to-purple-500">
            <div className="text-center sm:text-left">
              <h3 className="text-2xl font-bold text-white mb-2">Ready to Get Started?</h3>
              <p className="text-purple-100">Do More for Your Career with LearnTech</p>
            </div>
            <Link
              href="/login"
              className="px-6 py-3 bg-white text-purple-600 font-semibold rounded-lg hover:bg-gray-100 transition-all whitespace-nowrap"
            >
              Explore the Platform
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0d1117] border-t border-white/5 pt-16 pb-8">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-12 mb-16">
            {/* Programmes */}
            <div className="md:col-span-2">
              <h4 className="text-sm font-semibold text-white mb-6">Our Programmes</h4>
              <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                <div className="space-y-3">
                  {footerLinks.programmes.map((link, i) => (
                    <a key={i} href="#" className="block text-sm text-gray-400 hover:text-white transition-colors">
                      {link}
                    </a>
                  ))}
                </div>
                <div className="space-y-3">
                  {footerLinks.more.map((link, i) => (
                    <a key={i} href="#" className="block text-sm text-gray-400 hover:text-white transition-colors">
                      {link}
                    </a>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Learn About Us */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-6">Learn About Us</h4>
              <div className="space-y-3">
                {footerLinks.about.map((link, i) => (
                  <a key={i} href="#" className="block text-sm text-gray-400 hover:text-white transition-colors">
                    {link}
                  </a>
                ))}
              </div>
            </div>
            
            {/* Social & Hashtags */}
            <div>
              <div className="mb-6">
                <span className="text-cyan-400 font-bold text-lg">#BuildTheFuture</span>
                <span className="text-cyan-400 font-bold text-lg ml-2">#learntech</span>
              </div>
              <div className="flex items-center gap-4">
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                </a>
              </div>
              
              <div className="mt-8">
                <button className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
                  GO TO
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
          
          {/* Bottom Footer */}
          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <span>|</span>
              <a href="#" className="hover:text-white transition-colors">Cookies Policy</a>
              <span>|</span>
              <span>© Copyright 2026</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 p-1.5 rounded-lg">
                <Code2 className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">LearnTech</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
