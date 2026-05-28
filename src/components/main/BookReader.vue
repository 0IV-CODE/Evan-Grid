<script lang="ts">
type BibleVerse = {
  verse: string
  text: string
}

type BibleChapter = {
  chapter: string
  verses: BibleVerse[]
}

type BibleBook = {
  book: string
  chapters: BibleChapter[]
}

type FlatVerse = {
  id: string
  book: string
  chapter: string
  verse: string
  text: string
  isChapterStart: boolean
}

const bibleFiles = import.meta.glob('@/data/bible/en_kjv/*.json')

const bibleBookOrder = [
  // Old Testament
  'Genesis',
  'Exodus',
  'Leviticus',
  'Numbers',
  'Deuteronomy',
  'Joshua',
  'Judges',
  'Ruth',
  '1 Samuel',
  '2 Samuel',
  '1 Kings',
  '2 Kings',
  '1 Chronicles',
  '2 Chronicles',
  'Ezra',
  'Nehemiah',
  'Esther',
  'Job',
  'Psalms',
  'Proverbs',
  'Ecclesiastes',
  'Song of Solomon',
  'Isaiah',
  'Jeremiah',
  'Lamentations',
  'Ezekiel',
  'Daniel',
  'Hosea',
  'Joel',
  'Amos',
  'Obadiah',
  'Jonah',
  'Micah',
  'Nahum',
  'Habakkuk',
  'Zephaniah',
  'Haggai',
  'Zechariah',
  'Malachi',

  // New Testament
  'Matthew',
  'Mark',
  'Luke',
  'John',
  'Acts',
  'Romans',
  '1 Corinthians',
  '2 Corinthians',
  'Galatians',
  'Ephesians',
  'Philippians',
  'Colossians',
  '1 Thessalonians',
  '2 Thessalonians',
  '1 Timothy',
  '2 Timothy',
  'Titus',
  'Philemon',
  'Hebrews',
  'James',
  '1 Peter',
  '2 Peter',
  '1 John',
  '2 John',
  '3 John',
  'Jude',
  'Revelation',
]

export default {
  name: 'BookReader',

  data: () => ({
    drawer: false,

    books: [] as BibleBook[],
    currentBookName: '',
    currentChapter: '1',

    flatVerses: [] as FlatVerse[],
    bookSearch: '',
  }),

  computed: {
    filteredBooks(): BibleBook[] {
      const search = this.bookSearch.toLowerCase().trim()

      if (!search) return this.books

      return this.books.filter((book) => {
        return book.book.toLowerCase().includes(search)
      })
    },

    currentBook(): BibleBook | undefined {
      return this.books.find((book) => book.book === this.currentBookName)
    },

    bookItems(): string[] {
      return this.books.map((book) => book.book)
    },

    chapterItems(): string[] {
      return this.currentBook?.chapters.map((chapter) => chapter.chapter) ?? []
    },

    currentChapterIndex(): number {
      return this.chapterItems.findIndex((chapter) => chapter === this.currentChapter)
    },

    hasPreviousChapter(): boolean {
      return this.currentChapterIndex > 0
    },

    hasNextChapter(): boolean {
      return this.currentChapterIndex < this.chapterItems.length - 1
    },
  },

  async mounted() {
    await this.loadBible()

    if (this.books.length) {
      this.currentBookName = this.books[0].book
      this.currentChapter = '1'
      this.buildFlatVerses()
    }
  },

  methods: {
    async loadBible() {
      const loadedBooks: BibleBook[] = []

      for (const path in bibleFiles) {
        const mod: any = await bibleFiles[path]()

        // JSON files usually load under mod.default
        const bookData = mod.default ?? mod

        // Safety check
        if (!bookData.book || !Array.isArray(bookData.chapters)) {
          // console.warn('Invalid Bible JSON file:', path, bookData)
          continue
        }

        loadedBooks.push(bookData)
      }

      this.books = loadedBooks.sort((a, b) => {
        return bibleBookOrder.indexOf(a.book) - bibleBookOrder.indexOf(b.book)
      })
    },

    buildFlatVerses() {
      const book = this.currentBook
      if (!book) return

      const verses: FlatVerse[] = []

      book.chapters.forEach((chapter) => {
        chapter.verses.forEach((verse, index) => {
          verses.push({
            id: `${book.book}-${chapter.chapter}-${verse.verse}`,
            book: book.book,
            chapter: chapter.chapter,
            verse: verse.verse,
            text: verse.text,
            isChapterStart: index === 0,
          })
        })
      })

      this.flatVerses = verses
    },

    openBookChapters(bookName: string) {
      this.currentBookName = bookName
      this.currentChapter = '1'
      this.buildFlatVerses()
    },

    selectBook(bookName: string) {
      this.currentBookName = bookName
      this.currentChapter = '1'
      this.buildFlatVerses()

      this.$nextTick(() => {
        this.scrollToChapter('1')
      })
    },

    previousChapter() {
      if (!this.hasPreviousChapter) return

      const chapter = this.chapterItems[this.currentChapterIndex - 1]
      this.selectChapter(chapter)
    },

    nextChapter() {
      if (!this.hasNextChapter) return

      const chapter = this.chapterItems[this.currentChapterIndex + 1]
      this.selectChapter(chapter)
    },

    selectChapter(chapter: string) {
      this.currentChapter = chapter
      this.drawer = false

      this.$nextTick(() => {
        this.scrollToChapter(chapter)
      })
    },

    scrollToChapter(chapter: string) {
      const chapterStartIndex = this.flatVerses.findIndex((item) => {
        return item.chapter === chapter && item.isChapterStart
      })

      if (chapterStartIndex === -1) return

      const scroller = this.$refs.verseScroller as any

      if (scroller?.scrollToIndex) {
        scroller.scrollToIndex(chapterStartIndex)
      }
    },

    updateCurrentChapter() {
      const chapterEls = document.querySelectorAll('[data-bible-chapter]')

      let visibleChapter = this.currentChapter

      chapterEls.forEach((el) => {
        const rect = el.getBoundingClientRect()

        if (rect.top <= 130) {
          visibleChapter = String((el as HTMLElement).dataset.bibleChapter)
        }
      })

      this.currentChapter = visibleChapter
    },
  },
}
</script>

<template>
  <v-card class="pa-0 mx-auto rounded-0" max-width="520" rounded="0" elevation="0">
    <!-- Bible Reader -->
    <v-card class="pa-0" rounded="0" elevation="0">
      <v-virtual-scroll
        ref="verseScroller"
        :items="flatVerses"
        height="calc(100vh - 10px)"
        item-height="92"
        @scroll.passive="updateCurrentChapter"
      >
        <template #default="{ item }">
          <div :id="item.id" class="px-6 py-2">
            <div
              v-if="item.isChapterStart"
              :data-bible-chapter="item.chapter"
              class="text-center my-6"
            >
              <p class="text-h5 font-weight-bold mb-1">
                {{ item.book }}
              </p>

              <p style="font-size: 60px" class="pa-0 ma-0">{{ item.chapter }}</p>
            </div>

            <p class="text-body-1 mb-n6 bible-text">
              <span class="text-caption font-weight-bold text-grey mr-1">
                {{ item.verse }}
              </span>

              {{ item.text }}
            </p>
          </div>
        </template>
      </v-virtual-scroll>
    </v-card>

    <!-- Bottom Chapter Nav -->
    <v-bottom-navigation class="bg-primary mb-13">
      <v-card
        class="mx-auto d-flex align-center ga-2 pa-2 bg-primary"
        max-width="520"
        rounded="xl"
        elevation="0"
      >
        <v-btn
          icon="$ChevronLeft"
          variant="text"
          :disabled="!hasPreviousChapter"
          @click="previousChapter"
        />

        <v-btn variant="text" class="text-none font-weight-bold" @click="drawer = true">
          {{ currentBookName }} {{ currentChapter }}
        </v-btn>

        <v-btn
          icon="$ChevronRight"
          variant="text"
          :disabled="!hasNextChapter"
          @click="nextChapter"
        />
      </v-card>
    </v-bottom-navigation>

    <!-- Book & Chapter Dialog -->
    <v-dialog v-model="drawer" fullscreen>
      <v-card class="pa-0 bg-primary" elevation="0" rounded="0">
        <!-- Header -->
        <v-card class="pa-4 d-flex align-center ga-4" rounded="0" elevation="0">
          <v-btn icon="$ChevronLeft" variant="text" @click="drawer = false" />

          <p class="text-h6 font-weight-bold ma-0">Books</p>
        </v-card>

        <!-- Search -->
        <v-card class="pa-3" rounded="0" elevation="0">
          <v-text-field
            v-model="bookSearch"
            prepend-inner-icon="$Magnify"
            :append-inner-icon="bookSearch ? '$Close' : ''"
            label="Search"
            variant="outlined"
            rounded="xl"
            hide-details
            @click:append-inner="bookSearch = ''"
          />
        </v-card>

        <!-- Book List -->
        <v-card class="pa-0" rounded="0" elevation="0" height="100%" style="overflow-y: auto">
          <div v-for="book in filteredBooks" :key="book.book" class="py-2">
            <!-- Book Row -->
            <v-btn
              block
              variant="text"
              class="justify-start px-6 text-none"
              height="50"
              @click="openBookChapters(book.book)"
            >
              <span class="text-h6">{{ book.book }}</span>
            </v-btn>

            <!-- Chapter Grid Under Selected Book -->
            <v-card
              v-if="currentBookName === book.book"
              class="px-4 pt-2"
              elevation="0"
              variant="plain"
              height="400"
              style="overflow-y: auto"
            >
              <div class="d-flex flex-wrap ga-2">
                <v-btn
                  v-for="chapter in book.chapters"
                  :key="chapter.chapter"
                  width="64"
                  height="54"
                  rounded="lg"
                  :variant="chapter.chapter === currentChapter ? 'flat' : 'tonal'"
                  color="accent"
                  @click="selectChapter(chapter.chapter)"
                >
                  {{ chapter.chapter }}
                </v-btn>
              </div>
            </v-card>
          </div>
        </v-card>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<style scoped>
.bible-text {
  line-height: 1.2;
  font-family: Arial, Serif;
}
</style>
