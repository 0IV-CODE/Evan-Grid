import Dexie, { type Table } from 'dexie'

export type VerseAnnotation = {
  id?: number
  verseId: string
  book: string
  chapter: string
  verse: string
  text: string
  comment: string
  tags: string[]
  highlightColor: string
  createdAt: number
  updatedAt: number
}

class BibleNotesDb extends Dexie {
  annotations!: Table<VerseAnnotation, number>

  constructor() {
    super('BibleNotesDb')

    this.version(2).stores({
      annotations: '++id, verseId, book, chapter, *tags, updatedAt',
    })
  }
}

export const bibleNotesDb = new BibleNotesDb()
