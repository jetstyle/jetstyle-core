'use client'

import React, { useEffect, useState } from "react"

import { type TListResponse } from "@jetstyle/utils"
import { fetchResource, postResource, patchResource } from "@jetstyle/ui/helpers/api"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetTrigger } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { type CTask } from "@/types"

export default function TasksPage() {
  const [data, setData] = useState({
    todo: [] as Array<{ id: string; text: string; description: string }>,
    inProgress: [] as Array<{ id: string; text: string; description: string }>,
    done: [] as Array<{ id: string; text: string; description: string }>,
  })

  const [newCardText, setNewCardText] = useState({ todo: "", inProgress: "", done: "" })
  const [draggedCard, setDraggedCard] = useState<{ col: string; cardId: string } | null>(null)
  const [selectedCard, setSelectedCard] = useState<{ col: string; id: string } | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editDescription, setEditDescription] = useState("")

  const loadCards = async () => {
    const tasksResult = await fetchResource<TListResponse<CTask>>({
      apiService: 'taskTracker',
      apiPath: '/tasks',
    })

    if (tasksResult.err !== null) {
      // TODO: show error
    } else {
      const tasks = tasksResult.value.result
      const columns = {
        todo: [] as Array<{ id: string; text: string; description: string }>,
        inProgress: [] as Array<{ id: string; text: string; description: string }>,
        done: [] as Array<{ id: string; text: string; description: string }>,
      }
      tasks.forEach((task) => {
        const col = (task.status as keyof typeof columns) || 'todo'
        if (columns[col]) {
          columns[col].push({ id: task.uuid, text: task.title, description: task.description || '' })
        }
      })
      setData(columns)
    }
  }

  useEffect(() => {
    loadCards()
  }, [])

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

  const handleDrop = async (e: React.DragEvent, targetCol: string) => {
    e.preventDefault()
    if (draggedCard && draggedCard.col !== targetCol) {
      await patchResource<CTask>({
        apiService: 'taskTracker',
        apiPath: '/tasks',
        resourceId: draggedCard.cardId,
        toSubmit: { status: targetCol },
      })
      loadCards()
    }
    setDraggedCard(null)
  }

  const handleAddCard = async (col: string) => {
    if (!newCardText[col].trim()) return

    const result = await postResource<CTask>({
      apiService: 'taskTracker',
      apiPath: '/tasks',
      toSubmit: {
        title: newCardText[col],
        description: '',
        status: col,
      },
    })

    if (result.err === null) {
      loadCards()
    }
    setNewCardText(prev => ({ ...prev, [col]: '' }))
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
              onClick={async () => {
                if (!selectedCard) return
                const { id } = selectedCard
                const result = await patchResource<CTask>({
                  apiService: 'taskTracker',
                  apiPath: '/tasks',
                  resourceId: id,
                  toSubmit: {
                    title: editTitle,
                    description: editDescription,
                  },
                })

                if (result.err === null) {
                  loadCards()
                }
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
