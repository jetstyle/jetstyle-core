'use client'

import React, { useEffect, useState } from "react"

import { type TListResponse } from "@jetstyle/utils"
import { fetchResource, postResource, patchResource, deleteResource } from "@jetstyle/ui/helpers/api"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { type CTask } from "@/types"

type CMiniTasksData = {
  todo: CMiniTask[]
  inProgress: CMiniTask[]
  done: CMiniTask[]
};

type CMiniTask = {
  id: string
  text: string
  description: string
  isTemp?: boolean
};

function convertTask(task: CTask): CMiniTask {
  return {
    id: task.uuid,
    text: task.title,
    description: task.description || ""
  };
}

export default function TasksPage() {
  const [data, setData] = useState<CMiniTasksData>({ todo: [], inProgress: [], done: [] });
  const [dataError, setDataError] = useState<string | null>(null);

  const [newCardText, setNewCardText] = useState({ todo: "", inProgress: "", done: "" })
  const [draggedCard, setDraggedCard] = useState<{ col: string; cardId: string } | null>(null)
  const [selectedCard, setSelectedCard] = useState<{ col: string; id: string } | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editDescription, setEditDescription] = useState("")

  const loadCards = async () => {
    const tasksResult = await fetchResource<TListResponse<CTask>>({
      apiService: 'taskTracker',
      apiPath: '/tasks',
      query: {
        sortby: 'createdAt',
        sortdir: 'asc',
      }
    })

    if (tasksResult.err !== null) {
      setDataError(tasksResult.err);
    } else {
      console.log('tasks', tasksResult.value);

      const parsed = {
        todo: [],
        inProgress: [],
        done: [],
      } as CMiniTasksData;
      for (const task of tasksResult.value.result) {
        const parsedTask = convertTask(task);

        if (task.status in parsed) {
          (parsed[task.status] as CMiniTask[]).push(parsedTask);
        } else {
          parsed[task.status] = [parsedTask];
        }
      }

      setData(parsed);
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

  const handleDrop = (e: React.DragEvent, targetCol: string) => {
    e.preventDefault()
    // TODO: do not editTask() if targetCol === previousCol
    if (draggedCard && data[targetCol]) {
      const task = data[targetCol].find(card => card.id === draggedCard.cardId);
      editTask(targetCol, draggedCard.cardId, task.text, task.description);
    }
    setDraggedCard(null)
  }

  const handleAddCard = (col: string) => {
    if (!newCardText[col].trim()) return
    const newCard = { id: Date.now().toString(), isTemp: true, text: newCardText[col], description: "" };
    setData(prev => ({
      ...prev,
      [col]: [...prev[col], newCard]
    }))
    setNewCardText(prev => ({ ...prev, [col]: "" }));
    createTask(col, newCard.id, newCardText[col], newCard.text);
  }

  const handleCardClick = (col: string, id: string) => {
    setSelectedCard({ col, id })
    const card = data[col].find(item => item.id === id)
    if (card) {
      setEditTitle(card.text)
      setEditDescription(card.description)
    }
  }

  const createTask = async (col: string, tempId: string, title: string, description: string) => {
    const createTaskResult = await postResource<CTask>({
      apiService: 'taskTracker',
      apiPath: '/tasks',
      toSubmit: {
        title: title,
        description: description,
        tenant: "tracker",
        status: col,
      }
    });

    if (createTaskResult.err !== null) {
      setDataError(createTaskResult.err);

      setData(prev => ({
        ...prev,
        [col]: prev[col].filter(task => task.id !== tempId)
      }));
    } else {
      setData(prev => ({
        ...prev,
        [col]: prev[col].reduce((acc, task) => {
          if (task.id === tempId) {
            acc.push(convertTask(createTaskResult.value));
          } else {
            acc.push(task);
          }
          return acc;
        }, [] as CMiniTask[])
      }));
    }
  };

  const editTask = async (col: string, id: string, title: string, description: string) => {
    const editTaskResult = await patchResource<CTask>({
      apiService: 'taskTracker',
      apiPath: '/tasks',
      resourceId: id,
      toSubmit: {
        title: title,
        description: description,
        tenant: "tracker",
        status: col,
      }
    });

    if (editTaskResult.err !== null) {
      setDataError(editTaskResult.err);
    }
  };

  const deleteTask = async (col: string, id: string) => {
    const deleteTaskResult = await deleteResource({
      apiService: 'taskTracker',
      apiPath: '/tasks',
      resourceId: id
    });

    if (deleteTaskResult.err !== null) {
      setDataError(deleteTaskResult.err);
    }
  };

  const columns = Object.keys(data)
  return (<>
    {dataError && (
      <div id="alert-2"
           className="flex items-center p-4 mb-4 text-red-800 bg-red-50 dark:bg-gray-800 dark:text-red-400"
           role="alert">
        <svg className="shrink-0 w-4 h-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"
             fill="currentColor" viewBox="0 0 20 20">
          <path
            d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5ZM9.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM12 15H8a1 1 0 0 1 0-2h1v-3H8a1 1 0 0 1 0-2h2a1 1 0 0 1 1 1v4h1a1 1 0 0 1 0 2Z"/>
        </svg>
        <span className="sr-only">Info</span>
        <div className="ms-3 text-sm font-medium grow">
          {dataError}
        </div>
        <Button
          variant="outline"
          onClick={() => setDataError(null)}
        >
          Hide
        </Button>
      </div>
    )}
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
              draggable={!item.isTemp}
              onDragStart={e => handleDragStart(e, col, item.id)}
              onDragEnter={e => handleDragEnter(e, col, item.id)}
              onClick={!item.isTemp ? () => handleCardClick(col, item.id) : undefined}
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
                editTask(col, id, editTitle, editDescription);
              }}
            >
              Save
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!selectedCard) return
                const { col, id } = selectedCard
                setData(prev => {
                  const updated = { ...prev };
                  updated[col] = updated[col].filter(card => card.id !== id);
                  return updated;
                });
                setSelectedCard(null)
                deleteTask(col, id);
              }}
            >
              Delete
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  </>)
}
