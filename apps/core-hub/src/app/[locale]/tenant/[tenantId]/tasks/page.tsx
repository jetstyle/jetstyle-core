'use client'

import React, { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetTrigger } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"

export default function TasksPage() {
  const [data, setData] = useState({
    todo: [
      { id: "1", text: "Setup project", description: "Create initial project structure" }
    ],
    inProgress: [
      { id: "2", text: "Design UI", description: "Sketch the main layouts" }
    ],
    done: [
      { id: "3", text: "Review code", description: "Ensure quality and best practices" }
    ]
  })

  const [newCardText, setNewCardText] = useState({ todo: "", inProgress: "", done: "" })
  const [draggedCard, setDraggedCard] = useState<{ col: string; cardId: string } | null>(null)
  const [selectedCard, setSelectedCard] = useState<{ col: string; id: string } | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editDescription, setEditDescription] = useState("")

  const handleDragStart = (e: React.DragEvent, col: string, cardId: string) => {
    e.dataTransfer.setData("text/plain", JSON.stringify({ col, cardId }))
    setDraggedCard({ col, cardId })
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDragEnter = (e: React.DragEvent, col: string, targetCardId: string) => {
    if (!draggedCard || draggedCard.cardId === targetCardId) return
    setData(prev => {
      const updated = { ...prev }
      // Remove from source column
      const sourceItems = [...updated[draggedCard.col]]
      const draggedIndex = sourceItems.findIndex(c => c.id === draggedCard.cardId)
      const [removed] = sourceItems.splice(draggedIndex, 1)
      updated[draggedCard.col] = sourceItems
      // Insert at target index in the new column
      const targetItems = [...updated[col]]
      const targetIndex = targetItems.findIndex(c => c.id === targetCardId)
      targetItems.splice(targetIndex, 0, removed)
      updated[col] = targetItems
      return updated
    })
    // Update dragged card's column
    setDraggedCard({ ...draggedCard, col })
  }

  const handleDrop = (e: React.DragEvent, targetCol: string) => {
    e.preventDefault()
    setDraggedCard(null)
  }

  const handleAddCard = (col: string) => {
    if (!newCardText[col].trim()) return
    setData(prev => ({
      ...prev,
      [col]: [...prev[col], { id: Date.now().toString(), text: newCardText[col], description: "" }]
    }))
    setNewCardText(prev => ({ ...prev, [col]: "" }))
  }

  const handleCardClick = (col: string, id: string) => {
    setSelectedCard({ col, id })
    const card = data[col].find(item => item.id === id)
    if (card) {
      setEditTitle(card.text)
      setEditDescription(card.description)
    }
  }

  const columns = Object.keys(data)
  return (
    <div className="flex gap-4 p-4">
      {columns.map(col => (
        <div
          key={col}
          onDragOver={handleDragOver}
          onDrop={e => handleDrop(e, col)}
          className="flex flex-col w-1/3 p-2 space-y-2 border rounded-md bg-white/80"
        >
          <h2 className="text-xl font-bold capitalize">{col.replace(/([A-Z])/g, " $1")}</h2>
          {data[col].map(item => (
            <Card
              key={item.id}
              className="p-2 cursor-move hover:bg-gray-100 transition-colors"
              draggable
              onDragStart={e => handleDragStart(e, col, item.id)}
              onDragEnter={e => handleDragEnter(e, col, item.id)}
              onClick={() => handleCardClick(col, item.id)}
            >
              {item.text}
            </Card>
          ))}
          <div className="flex items-center space-x-2 pt-1">
            <Input
              value={newCardText[col]}
              onChange={e => setNewCardText(prev => ({ ...prev, [col]: e.target.value }))}
              placeholder={`New card in ${col}`}
            />
            <Button onClick={() => handleAddCard(col)}>Add</Button>
          </div>
        </div>
      ))}
      <Sheet open={!!selectedCard} onOpenChange={open => !open && setSelectedCard(null)}>
        <SheetContent side="right" className="w-96">
          <SheetHeader>
            <SheetTitle>Edit Card</SheetTitle>
            <SheetDescription>Update name and description</SheetDescription>
          </SheetHeader>
          <div className="py-4 space-y-3">
            <Input
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              placeholder="Card title"
            />
            <Textarea
              value={editDescription}
              onChange={e => setEditDescription(e.target.value)}
              placeholder="Card description"
            />
          </div>
          <SheetFooter>
            <Button
              onClick={() => {
                if (!selectedCard) return
                const { col, id } = selectedCard
                setData(prev => {
                  const updated = { ...prev }
                  updated[col] = updated[col].map(card =>
                    card.id === id ? { ...card, text: editTitle, description: editDescription } : card
                  )
                  return updated
                })
                setSelectedCard(null)
              }}
            >
              Save
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}
