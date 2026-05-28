// Vuetify
// how too add vuetify: https://www.youtube.com/watch?v=w6bj_GCxwqg

import 'vuetify/styles'

import { createVuetify } from 'vuetify'

// MDI - JS SVG (Adv - Optimized)
import { aliases, mdi } from 'vuetify/iconsets/mdi-svg'
// Import Icons here
import { mdiEyeOutline } from '@mdi/js'
import { mdiEyeOffOutline } from '@mdi/js'
import { mdiClose } from '@mdi/js'
import { mdiChevronRight } from '@mdi/js'
import { mdiChevronLeft } from '@mdi/js'
import { mdiChevronDown } from '@mdi/js'
import { mdiChevronUp } from '@mdi/js'
import { mdiRefresh } from '@mdi/js'
import { mdiPlus } from '@mdi/js'
import { mdiCircle } from '@mdi/js'
import { mdiContentSaveOutline } from '@mdi/js'
import { mdiTrashCanOutline } from '@mdi/js'
import { mdiGrid } from '@mdi/js'
import { mdiLock } from '@mdi/js'
import { mdiLockOpenVariantOutline } from '@mdi/js'
import { mdiContentCopy } from '@mdi/js'
import { mdiMenu } from '@mdi/js'
import { mdiCheckboxMarkedOutline } from '@mdi/js'
import { mdiCheckboxBlankOutline } from '@mdi/js'
import { mdiInformationBoxOutline } from '@mdi/js'
import { mdiHome } from '@mdi/js'
import { mdiHomeAlertOutline } from '@mdi/js'
import { mdiHomeAccount } from '@mdi/js'
import { mdiHomeAnalytics } from '@mdi/js'
import { mdiHomeAutomation } from '@mdi/js'
import { mdiHomeClockOutline } from '@mdi/js'
import { mdiHomeFlood } from '@mdi/js'
import { mdiHomeHeart } from '@mdi/js'
import { mdiHomeOff } from '@mdi/js'
import { mdiHomeLightningBoltOutline } from '@mdi/js'
import { mdiHomeLock } from '@mdi/js'
import { mdiHomeLockOpen } from '@mdi/js'
import { mdiCropSquare } from '@mdi/js'
import { mdiMapSearchOutline } from '@mdi/js'
import { mdiAccountGroup } from '@mdi/js'
import { mdiCog } from '@mdi/js'
import { mdiArrowLeftThin } from '@mdi/js'
import { mdiArrowRightThin } from '@mdi/js'
import { mdiVectorSquarePlus } from '@mdi/js'
import { mdiFormatText } from '@mdi/js'
import { mdiIncognito } from '@mdi/js'
import { mdiDatabaseOutline } from '@mdi/js'
import { mdiCloudOffOutline } from '@mdi/js'
import { mdiWeatherNight } from '@mdi/js'
import { mdiWeatherSunny } from '@mdi/js'
import { mdiBookOpenPageVariantOutline } from '@mdi/js'
import { mdiSortAlphabeticalAscending } from '@mdi/js'
import { mdiHistory } from '@mdi/js'
import { mdiMagnify } from '@mdi/js'
import { mdiMusicNoteEighth } from '@mdi/js'
import { mdiAccountNetworkOutline } from '@mdi/js'
import { mdiNotebookOutline } from '@mdi/js'
import { mdiCalendarBlankOutline } from '@mdi/js'
import { mdiPencilOutline } from '@mdi/js'
import { mdiPin } from '@mdi/js'
import { mdiPinOff } from '@mdi/js'
import { mdiCheckCircleOutline } from '@mdi/js'
import { mdiFileDocumentOutline } from '@mdi/js'
import { mdiFormatListBulleted } from '@mdi/js'
import { mdiArrowULeftTop } from '@mdi/js'
import { mdiArrowURightTop } from '@mdi/js'

// Components (explicit)
import {
  VApp,
  VMain,
  VTooltip,
  VRow,
  VCol,
  VBtn,
  VCard,
  VCardTitle,
  VCardText,
  VCardActions,
  VDialog,
  VWindow,
  VWindowItem,
  VList,
  VListItem,
  VListItemTitle,
  VTextField,
  VVirtualScroll,
  VNavigationDrawer,
  VSelect,
  VListGroup,
  VBtnToggle,
  VDataTable,
  VSwitch,
  VSlider,
  VCheckbox,
  VCombobox,
  VForm,
  VFileInput,
  VListItemSubtitle,
  VDataTableVirtual,
  VIcon,
  VTextarea,
  VAlert,
  VBottomNavigation,
} from 'vuetify/components'
import { Ripple } from 'vuetify/directives'

export default createVuetify({
  components: {
    VApp,
    VMain,
    VTooltip,
    VBtn,
    VIcon,
    VSwitch,
    VSlider,
    VCheckbox,
    VCombobox,
    VBtnToggle,
    VCard,
    VCardTitle,
    VCardText,
    VCardActions,
    VCol,
    VDialog,
    VNavigationDrawer,
    VRow,
    VSelect,
    VTextField,
    VVirtualScroll,
    VWindow,
    VWindowItem,
    VList,
    VListItem,
    VListItemTitle,
    VListItemSubtitle,
    VListGroup,
    VDataTable,
    VDataTableVirtual,
    VForm,
    VFileInput,
    VTextarea,
    VAlert,
    VBottomNavigation,
  },
  directives: { Ripple },
  theme: {
    defaultTheme: 'dark',
    themes: {
      dark: {
        variables: {},
        dark: true,
        colors: {
          primary: '#000000',
          secondary: '#ffffff',
          accent: '#2196F3',
        },
      },
      light: {
        variables: {},
        dark: false,
        colors: {
          primary: '#ffffff',
          secondary: '#ffffff',
          accent: '#2196F3',
        },
      },
    },
  },
  icons: {
    defaultSet: 'mdi',
    // Add alias to reuse icons in web/app
    // ex: <v-icon icon="$account" />
    aliases: {
      ...aliases,
      InformationBoxOutline: mdiInformationBoxOutline,
      CheckboxMarkedOutline: mdiCheckboxMarkedOutline,
      CheckboxBlankOutline: mdiCheckboxBlankOutline,
      ChevronUp: mdiChevronUp,
      ChevronDown: mdiChevronDown,
      EyeOutline: mdiEyeOutline,
      EyeOffOutline: mdiEyeOffOutline,
      Close: mdiClose,
      ChevronRight: mdiChevronRight,
      ChevronLeft: mdiChevronLeft,
      Refresh: mdiRefresh,
      Plus: mdiPlus,
      Circle: mdiCircle,
      ContentSaveOutline: mdiContentSaveOutline,
      TrashCanOutline: mdiTrashCanOutline,
      Grid: mdiGrid,
      Lock: mdiLock,
      LockOpenVariantOutline: mdiLockOpenVariantOutline,
      ContentCopy: mdiContentCopy,
      Menu: mdiMenu,
      Home: mdiHome,
      HomeAlertOutline: mdiHomeAlertOutline,
      HomeAccount: mdiHomeAccount,
      HomeAnalytics: mdiHomeAnalytics,
      HomeAutomation: mdiHomeAutomation,
      HomeClockOutline: mdiHomeClockOutline,
      HomeFlood: mdiHomeFlood,
      HomeHeart: mdiHomeHeart,
      HomeOff: mdiHomeOff,
      HomeLightningBoltOutline: mdiHomeLightningBoltOutline,
      HomeLock: mdiHomeLock,
      HomeLockOpen: mdiHomeLockOpen,
      CropSquare: mdiCropSquare,
      MapSearchOutline: mdiMapSearchOutline,
      AccountGroup: mdiAccountGroup,
      Cog: mdiCog,
      ArrowLeftThin: mdiArrowLeftThin,
      ArrowRightThin: mdiArrowRightThin,
      VectorSquarePlus: mdiVectorSquarePlus,
      FormatText: mdiFormatText,
      Incognito: mdiIncognito,
      DatabaseOutline: mdiDatabaseOutline,
      CloudOffOutline: mdiCloudOffOutline,
      WeatherNight: mdiWeatherNight,
      WeatherSunny: mdiWeatherSunny,
      BookOpenPageVariantOutline: mdiBookOpenPageVariantOutline,
      SortAlphabeticalAscending: mdiSortAlphabeticalAscending,
      History: mdiHistory,
      Magnify: mdiMagnify,
      MusicNoteEighth: mdiMusicNoteEighth,
      AccountNetworkOutline: mdiAccountNetworkOutline,
      NotebookOutline: mdiNotebookOutline,
      CalendarBlankOutline: mdiCalendarBlankOutline,
      PencilOutline: mdiPencilOutline,
      Pin: mdiPin,
      PinOff: mdiPinOff,
      CheckCircleOutline: mdiCheckCircleOutline,
      FileDocumentOutline: mdiFileDocumentOutline,
      FormatListBulleted: mdiFormatListBulleted,
      ArrowULeftTop: mdiArrowULeftTop,
      ArrowURightTop: mdiArrowURightTop,
    },
    sets: {
      mdi,
    },
  },
})
