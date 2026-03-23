"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Plus,
  X,
  Save,
  CheckCircle,
} from "lucide-react"

// Mock availability slots
const AVAILABILITY_SLOTS = [
  { day: "Monday", slots: ["9:00 AM", "10:00 AM", "2:00 PM", "3:00 PM", "4:00 PM"] },
  { day: "Tuesday", slots: ["10:00 AM", "11:00 AM", "2:00 PM"] },
  { day: "Wednesday", slots: ["9:00 AM", "10:00 AM", "11:00 AM", "3:00 PM", "4:00 PM"] },
  { day: "Thursday", slots: ["2:00 PM", "3:00 PM", "4:00 PM"] },
  { day: "Friday", slots: ["9:00 AM", "10:00 AM", "11:00 AM"] },
]

export default function AvailabilityPage() {
  const [schedule, setSchedule] = useState<{ day: string; slots: string[] }[]>(
    AVAILABILITY_SLOTS.map(s => ({ ...s }))
  )
  const [addingSlotDay, setAddingSlotDay] = useState<string | null>(null)
  const [newSlotTime, setNewSlotTime] = useState("09:00")
  const [showTimezoneModal, setShowTimezoneModal] = useState(false)
  const [selectedTimezone, setSelectedTimezone] = useState("PST (UTC-8)")

  const timeOptions = [
    "6:00 AM", "7:00 AM", "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM",
    "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM",
    "6:00 PM", "7:00 PM", "8:00 PM", "9:00 PM"
  ]

  const timezones = [
    "PST (UTC-8)", "MST (UTC-7)", "CST (UTC-6)", "EST (UTC-5)",
    "GMT (UTC+0)", "CET (UTC+1)", "IST (UTC+5:30)", "JST (UTC+9)"
  ]

  const handleAddSlot = (day: string, slot: string) => {
    setSchedule(prev => {
      const existingDay = prev.find(s => s.day === day)
      if (existingDay) {
        if (existingDay.slots.includes(slot)) return prev
        return prev.map(s =>
          s.day === day ? { ...s, slots: [...s.slots, slot].sort((a, b) => {
            const parseTime = (t: string) => {
              const [time, period] = t.split(" ")
              let [hours] = time.split(":").map(Number)
              if (period === "PM" && hours !== 12) hours += 12
              if (period === "AM" && hours === 12) hours = 0
              return hours
            }
            return parseTime(a) - parseTime(b)
          }) } : s
        )
      } else {
        return [...prev, { day, slots: [slot] }]
      }
    })
    setAddingSlotDay(null)
  }

  const handleRemoveSlot = (day: string, slot: string) => {
    setSchedule(prev =>
      prev.map(s =>
        s.day === day ? { ...s, slots: s.slots.filter(sl => sl !== slot) } : s
      ).filter(s => s.slots.length > 0)
    )
  }

  const getDaySlots = (day: string) => {
    return schedule.find(s => s.day === day)?.slots || []
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Availability</h2>
          <p className="text-gray-500 text-sm">Set your available time slots for mentoring sessions</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>

      {/* Timezone */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Your Timezone</p>
              <p className="text-sm text-gray-500">{selectedTimezone}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowTimezoneModal(true)}>
              Change
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Weekly Schedule</CardTitle>
          <CardDescription>Select your available time slots for each day</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => {
              const daySlots = getDaySlots(day)
              return (
                <div key={day} className="flex items-start gap-4 py-3 border-b border-gray-100 last:border-0">
                  <div className="w-28 shrink-0">
                    <p className="font-medium text-gray-900">{day}</p>
                    <p className="text-xs text-gray-400">{daySlots.length} slot{daySlots.length !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap gap-2 items-center">
                      {daySlots.map((slot, idx) => (
                        <Badge 
                          key={idx} 
                          className="bg-blue-100 text-blue-700 border-0 px-3 py-1"
                        >
                          {slot}
                          <button
                            onClick={() => handleRemoveSlot(day, slot)}
                            className="ml-2 hover:text-red-600 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                      {addingSlotDay === day ? (
                        <div className="flex items-center gap-2">
                          <select
                            value={newSlotTime}
                            onChange={(e) => setNewSlotTime(e.target.value)}
                            className="px-2 py-1 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {timeOptions.filter(t => !daySlots.includes(t)).map((time) => (
                              <option key={time} value={time}>{time}</option>
                            ))}
                          </select>
                          <Button 
                            size="sm" 
                            className="h-7 bg-blue-600 hover:bg-blue-700"
                            onClick={() => handleAddSlot(day, newSlotTime)}
                          >
                            <CheckCircle className="w-3 h-3" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-7"
                            onClick={() => setAddingSlotDay(null)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-7 text-blue-600 border-dashed"
                          onClick={() => {
                            setAddingSlotDay(day)
                            const availableTimes = timeOptions.filter(t => !daySlots.includes(t))
                            if (availableTimes.length > 0) setNewSlotTime(availableTimes[0])
                          }}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add Slot
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Session Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Session Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium text-gray-900">Session Duration Options</p>
              <p className="text-sm text-gray-500">Available session lengths</p>
            </div>
            <div className="flex gap-2">
              <Badge className="bg-blue-100 text-blue-700 border-0">30 min</Badge>
              <Badge className="bg-blue-100 text-blue-700 border-0">45 min</Badge>
              <Badge className="bg-blue-100 text-blue-700 border-0">60 min</Badge>
            </div>
          </div>
          <div className="flex items-center justify-between py-2 border-t border-gray-100">
            <div>
              <p className="font-medium text-gray-900">Buffer Time</p>
              <p className="text-sm text-gray-500">Break between sessions</p>
            </div>
            <select className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>15 minutes</option>
              <option>30 minutes</option>
              <option>45 minutes</option>
            </select>
          </div>
          <div className="flex items-center justify-between py-2 border-t border-gray-100">
            <div>
              <p className="font-medium text-gray-900">Advance Booking</p>
              <p className="text-sm text-gray-500">How far in advance students can book</p>
            </div>
            <select className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>1 week</option>
              <option>2 weeks</option>
              <option>1 month</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Timezone Modal */}
      {showTimezoneModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Change Timezone</h3>
                <Button variant="ghost" size="icon" onClick={() => setShowTimezoneModal(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Timezone</label>
                <select
                  value={selectedTimezone}
                  onChange={(e) => setSelectedTimezone(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {timezones.map((tz) => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>
              <p className="text-sm text-gray-500">
                Your availability will be shown to students in their local timezone.
              </p>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowTimezoneModal(false)}>
                Cancel
              </Button>
              <Button 
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => setShowTimezoneModal(false)}
              >
                Save Timezone
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
