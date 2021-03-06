import Vue from 'vue'

import ModelToggleMixin from '../../mixins/model-toggle.js'
import PortalMixin from '../../mixins/portal.js'

import preventScroll from '../../utils/prevent-scroll.js'
import EscapeKey from '../../utils/escape-key.js'
import slot from '../../utils/slot.js'

let modalsOpened = 0

const positionClass = {
  standard: 'flex-center',
  top: 'items-start justify-center',
  bottom: 'items-end justify-center',
  right: 'items-center justify-end',
  left: 'items-center justify-start'
}

const transitions = {
  top: ['down', 'up'],
  bottom: ['up', 'down'],
  right: ['left', 'right'],
  left: ['right', 'left']
}

export default Vue.extend({
  name: 'QDialog',

  mixins: [ ModelToggleMixin, PortalMixin ],

  modelToggle: {
    history: true
  },

  props: {
    persistent: Boolean,
    noEscKey: Boolean,
    seamless: Boolean,

    maximized: Boolean,
    fullWidth: Boolean,
    fullHeight: Boolean,

    position: {
      type: String,
      default: 'standard',
      validator (val) {
        return val === 'standard' || ['top', 'bottom', 'left', 'right'].includes(val)
      }
    },

    transitionShow: {
      type: String,
      default: 'scale'
    },
    transitionHide: {
      type: String,
      default: 'scale'
    },

    noRefocus: Boolean
  },

  data () {
    return {
      transitionState: this.showing
    }
  },

  watch: {
    $route () {
      this.persistent !== true && this.seamless !== true && this.hide()
    },

    showing (val) {
      if (this.position !== 'standard' || this.transitionShow !== this.transitionHide) {
        this.$nextTick(() => {
          this.transitionState = val
        })
      }
    },

    seamless (v) {
      this.showing === true && this.__updateSeamless(!v)
    }
  },

  computed: {
    classes () {
      return `q-dialog__inner--${this.maximized ? 'maximized' : 'minimized'} ` +
        `q-dialog__inner--${this.position} ${positionClass[this.position]}` +
        (this.fullWidth ? ' q-dialog__inner--fullwidth' : '') +
        (this.fullHeight ? ' q-dialog__inner--fullheight' : '')
    },

    transition () {
      return 'q-transition--' + (
        this.position === 'standard'
          ? (this.transitionState === true ? this.transitionHide : this.transitionShow)
          : 'slide-' + transitions[this.position][this.transitionState === true ? 1 : 0]
      )
    }
  },

  methods: {
    shake () {
      const node = this.__portal.$refs.inner

      node.classList.remove('q-animate--scale')
      node.classList.add('q-animate--scale')
      clearTimeout(this.shakeTimeout)
      this.shakeTimeout = setTimeout(() => {
        node.classList.remove('q-animate--scale')
      }, 170)
    },

    __show (evt) {
      clearTimeout(this.timer)

      this.__refocusTarget = this.noRefocus === false
        ? document.activeElement
        : void 0

      if (this.__refocusTarget !== void 0) {
        this.__refocusTarget.blur()
      }

      if (this.seamless !== true) {
        this.__updateSeamless(true)
      }

      EscapeKey.register(() => {
        if (this.seamless !== true) {
          if (this.persistent || this.noEscKey === true) {
            this.maximized !== true && this.shake()
          }
          else {
            this.$emit('escape-key')
            this.hide()
          }
        }
      })

      this.__showPortal()

      this.$nextTick(() => {
        const node = this.__portal.$refs.inner

        if (this.$q.platform.is.ios) {
          // workaround the iOS hover/touch issue
          node.click()
        }

        node.focus()
      })

      this.timer = setTimeout(() => {
        this.$emit('show', evt)
      }, 600)
    },

    __hide (evt) {
      this.__cleanup(true)

      this.timer = setTimeout(() => {
        this.__hidePortal(evt)

        if (this.__refocusTarget !== void 0) {
          this.__refocusTarget.focus()
        }

        this.$emit('hide', evt)
      }, 600)
    },

    __cleanup (hiding) {
      clearTimeout(this.timer)
      clearTimeout(this.shakeTimeout)

      EscapeKey.pop()

      if (this.seamless !== true && (hiding === true || this.showing === true)) {
        this.__updateSeamless(false)
      }
    },

    __updateSeamless (val) {
      if (val === true) {
        this.__register(true)
        preventScroll(true)
      }
      else {
        preventScroll(false)
        this.__register(false)
      }
    },

    __register (opening) {
      let state = opening
        ? { action: 'add', step: 1 }
        : { action: 'remove', step: -1 }

      modalsOpened += state.step

      if (opening !== true && modalsOpened > 0) {
        return
      }

      document.body.classList[state.action]('q-body--dialog')
    },

    __render (h) {
      return h('div', {
        staticClass: 'q-dialog fullscreen no-pointer-events'
      }, [
        h('transition', {
          props: { name: 'q-transition--fade' }
        }, this.showing && this.seamless !== true ? [
          h('div', {
            staticClass: 'q-dialog__backdrop fixed-full',
            on: {
              click: this.persistent === false ? this.hide : this.shake
            }
          })
        ] : null),

        h('transition', {
          props: { name: this.transition }
        }, [
          this.showing === true ? h('div', {
            ref: 'inner',
            staticClass: 'q-dialog__inner fixed-full flex no-pointer-events',
            class: this.classes,
            attrs: { tabindex: -1 }
          }, slot(this, 'default')) : null
        ])
      ])
    }
  },

  mounted () {
    this.value === true && this.show()
  },

  beforeDestroy () {
    this.__cleanup()
  }
})
