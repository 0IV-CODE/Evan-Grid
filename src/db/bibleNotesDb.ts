import Dexie, { type Table } from 'dexie'

export type NoteVerse = {
  verseId: string
  book: string
  chapter: string
  verse: string
  text: string
}

export type BibleNote = {
  id?: number

  // zero, one, or many verses
  verses: NoteVerse[]

  comment: string
  tags: string[]
  highlightColor: string

  createdAt: number
  updatedAt: number
}

class BibleNotesDb extends Dexie {
  notes!: Table<BibleNote, number>

  constructor() {
    super('BibleNotesDb')

    this.version(3).stores({
      notes: '++id, updatedAt, *tags',
    })
  }
}

export const bibleNotesDb = new BibleNotesDb()
