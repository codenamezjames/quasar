import Vue from 'vue'

import QBtn from '../btn/QBtn.js'
import TouchPan from '../../directives/touch-pan.js'

import { position } from '../../utils/event.js'
import DateTimeMixin from './datetime-mixin.js'

export default Vue.extend({
  name: 'QTime',

  mixins: [ DateTimeMixin ],

  directives: {
    TouchPan
  },

  props: {
    value: {
      validator: v => typeof v === 'string'
        ? /^[0-2]?\d:[0-5]\d(:[0-5]\d)?$/.test(v)
        : true
    },

    format24h: {
      type: Boolean,
      default: null
    },

    options: Function,
    hourOptions: Array,
    minuteOptions: Array,
    secondOptions: Array,

    withSeconds: Boolean,
    nowBtn: Boolean
  },

  data () {
    return {
      view: 'Hour',
      numberModel: this.__getNumberModel(this.value)
    }
  },

  watch: {
    value (v) {
      this.numberModel = this.__getNumberModel(v)
    }
  },

  computed: {
    classes () {
      return {
        'q-time--dark': this.dark,
        'q-time--readonly': this.readonly,
        'disabled': this.disable,
        [`q-time--${this.landscape === true ? 'landscape' : 'portrait'}`]: true
      }
    },

    stringModel () {
      const time = this.numberModel

      return {
        hour: time.hour === null
          ? '--'
          : (
            this.computedFormat24h === true
              ? this.__pad(time.hour)
              : (
                this.isAM === true
                  ? (time.hour === 0 ? 12 : time.hour)
                  : (time.hour > 12 ? time.hour - 12 : time.hour)
              )
          ),
        minute: time.minute === null
          ? '--'
          : this.__pad(time.minute),
        second: time.second === null
          ? '--'
          : this.__pad(time.second)
      }
    },

    computedFormat24h () {
      return this.format24h !== null
        ? this.format24h
        : this.$q.i18n.date.format24h
    },

    pointerStyle () {
      const
        forHour = this.view === 'Hour',
        divider = forHour ? 12 : 60,
        amount = this.numberModel[this.view.toLowerCase()],
        degrees = Math.round(amount * (360 / divider)) - 180

      let transform = `rotate3d(0,0,1,${degrees}deg) translate3d(-50%,0,0)`

      if (forHour && this.computedFormat24h && !(this.numberModel.hour > 0 && this.numberModel.hour < 13)) {
        transform += ' scale3d(.7,.7,.7)'
      }

      return { transform }
    },

    minLink () {
      return this.numberModel.hour !== null
    },

    secLink () {
      return this.minLink && this.numberModel.minute !== null
    },

    isAM () {
      return this.numberModel.hour === null || this.numberModel.hour < 12
    },

    hourInSelection () {
      return this.hourOptions !== void 0
        ? val => this.hourOptions.includes(val)
        : (
          this.options !== void 0
            ? val => this.options(val, null, null)
            : void 0
        )
    },

    minuteInSelection () {
      return this.minuteOptions !== void 0
        ? val => this.minuteOptions.includes(val)
        : (
          this.options !== void 0
            ? val => this.options(this.numberModel.hour, val, null)
            : void 0
        )
    },

    secondInSelection () {
      return this.secondOptions !== void 0
        ? val => this.secondOptions.includes(val)
        : (
          this.options !== void 0
            ? val => this.options(this.numberModel.hour, this.numberModel.minute, val)
            : void 0
        )
    },

    positions () {
      let start, end, offset = 0, step = 1, inSel

      if (this.view === 'Hour') {
        inSel = this.hourInSelection

        if (this.computedFormat24h === true) {
          start = 0
          end = 23
        }
        else {
          start = 0
          end = 11

          if (this.isAM === false) {
            offset = 12
          }
        }
      }
      else {
        start = 0
        end = 55
        step = 5

        if (this.view === 'Minute') {
          inSel = this.minuteInSelection
        }
        else {
          inSel = this.secondInSelection
        }
      }

      const pos = []

      for (let val = start, index = start; val <= end; val += step, index++) {
        const
          actualVal = val + offset,
          disable = inSel !== void 0 && inSel(actualVal) === false,
          label = this.view === 'Hour' && val === 0
            ? (this.format24h === true ? '00' : '12')
            : val

        pos.push({ val: actualVal, index, disable, label })
      }

      return pos
    }
  },

  methods: {
    __drag (event) {
      if (event.isFirst) {
        const
          clock = this.$refs.clock,
          { top, left, width } = clock.getBoundingClientRect(),
          dist = width / 2

        this.dragging = {
          top: top + dist,
          left: left + dist,
          dist: dist * 0.7
        }
        this.__updateClock(event.evt)
      }
      else if (event.isFinal) {
        this.__updateClock(event.evt)
        this.dragging = false

        if (this.view === 'Hour') {
          this.view = 'Minute'
        }
        else if (this.withSeconds && this.view === 'Minute') {
          this.view = 'Second'
        }
      }
      else {
        this.__updateClock(event.evt)
      }
    },

    __updateClock (evt) {
      let
        pos = position(evt),
        height = Math.abs(pos.top - this.dragging.top),
        distance = Math.sqrt(
          Math.pow(Math.abs(pos.top - this.dragging.top), 2) +
          Math.pow(Math.abs(pos.left - this.dragging.left), 2)
        ),
        angle = Math.asin(height / distance) * (180 / Math.PI)

      if (pos.top < this.dragging.top) {
        angle = this.dragging.left < pos.left ? 90 - angle : 270 + angle
      }
      else {
        angle = this.dragging.left < pos.left ? angle + 90 : 270 - angle
      }

      if (this.view === 'Hour') {
        let hour = Math.round(angle / 30)

        if (this.computedFormat24h === true) {
          if (hour === 0) {
            hour = distance < this.dragging.dist ? 0 : 12
          }
          else if (distance < this.dragging.dist) {
            hour += 12
          }
        }
        else {
          if (this.isAM === true) {
            if (hour === 12) {
              hour = 0
            }
          }
          else {
            hour += 12
          }
        }

        if (hour === 24) {
          hour = 0
        }

        if (this.hourInSelection !== void 0 && this.hourInSelection(hour) !== true) {
          return
        }

        this.__setHour(hour)
      }
      else {
        let val = Math.round(angle / 6)

        if (val === 60) {
          val = 0
        }

        const opt = this.view === 'Minute'
          ? this.minuteInSelection
          : this.secondInSelection

        if (opt !== void 0 && opt(val) !== true) {
          return
        }

        this[`__set${this.view}`](val)
      }
    },

    __getHeader (h) {
      const label = [
        h('div', {
          staticClass: 'q-time__link',
          'class': this.view === 'Hour' ? 'q-time__link--active' : false,
          attrs: { tabindex: this.computedTabindex },
          on: {
            click: () => { this.view = 'Hour' },
            keyup: e => { e.keyCode === 13 && (this.view = 'Hour') }
          }
        }, [ this.stringModel.hour ]),
        h('div', [ ':' ]),
        h(
          'div',
          this.minLink === true
            ? {
              staticClass: 'q-time__link',
              'class': this.view === 'Minute' ? 'q-time__link--active' : false,
              attrs: { tabindex: this.computedTabindex },
              on: {
                click: () => { this.view = 'Minute' },
                keyup: e => { e.keyCode === 13 && (this.view = 'Minute') }
              }
            }
            : null,
          [ this.stringModel.minute ]
        )
      ]

      if (this.withSeconds === true) {
        label.push(
          h('div', [ ':' ]),
          h(
            'div',
            this.secLink === true
              ? {
                staticClass: 'q-time__link',
                'class': this.view === 'Second' ? 'q-time__link--active' : false,
                attrs: { tabindex: this.computedTabindex },
                on: {
                  click: () => { this.view = 'Second' },
                  keyup: e => { e.keyCode === 13 && (this.view = 'Second') }
                }
              } : null,
            [ this.stringModel.second ]
          )
        )
      }

      return h('div', {
        staticClass: 'q-time__header flex flex-center no-wrap',
        'class': this.headerClass
      }, [
        h('div', {
          staticClass: 'q-time__header-label row items-center no-wrap'
        }, label),

        this.computedFormat24h === false ? h('div', {
          staticClass: 'q-time__header-ampm column items-between no-wrap'
        }, [
          h('div', {
            staticClass: 'q-time__link',
            'class': this.isAM === true ? 'q-time__link--active' : null,
            attrs: { tabindex: this.computedTabindex },
            on: {
              click: this.__setAm,
              keyup: e => { e.keyCode === 13 && this.__setAm() }
            }
          }, [ 'AM' ]),

          h('div', {
            staticClass: 'q-time__link',
            'class': this.isAM !== true ? 'q-time__link--active' : null,
            attrs: { tabindex: this.computedTabindex },
            on: {
              click: this.__setPm,
              keyup: e => { e.keyCode === 13 && this.__setPm() }
            }
          }, [ 'PM' ])
        ]) : null
      ])
    },

    __getClock (h) {
      const
        view = this.view.toLowerCase(),
        current = this.numberModel[view],
        f24 = this.view === 'Hour' && this.computedFormat24h === true
          ? ' fmt24'
          : ''

      return h('div', {
        staticClass: 'q-time__content col'
      }, [
        h('div', {
          staticClass: 'q-time__view fit relative-position'
        }, [
          h('transition', {
            props: { name: 'q-transition--scale' }
          }, [
            h('div', {
              ref: 'clock',
              key: 'clock' + this.view,
              staticClass: 'q-time__clock cursor-pointer absolute-full',
              directives: [{
                name: 'touch-pan',
                value: this.__drag,
                modifiers: {
                  stop: true,
                  prevent: true
                }
              }]
            }, [
              h('div', { staticClass: 'q-time__clock-circle fit' }, [
                this.numberModel[view] !== null
                  ? h('div', {
                    staticClass: 'q-time__clock-pointer',
                    style: this.pointerStyle
                  })
                  : null,

                this.positions.map(pos => h('div', {
                  staticClass: `q-time__clock-position row flex-center${f24} q-time__clock-pos-${pos.index}`,
                  'class': pos.val === current
                    ? this.headerClass.concat(' q-time__clock-position--active')
                    : (pos.disable ? 'q-time__clock-position--disable' : null)
                }, [ h('span', [ pos.label ]) ]))
              ])
            ])
          ]),

          this.nowBtn === true ? h(QBtn, {
            staticClass: 'q-time__now-button absolute-top-right',
            props: {
              icon: 'access_time',
              unelevated: true,
              size: 'sm',
              round: true,
              color: this.color,
              textColor: this.textColor,
              tabindex: this.computedTabindex
            },
            on: {
              click: this.__setNow
            }
          }) : null
        ])
      ])
    },

    __getNumberModel (v) {
      if (v === void 0 || v === null) {
        return {
          hour: null,
          minute: null,
          second: null
        }
      }

      const val = v.split(':')
      return {
        hour: parseInt(val[0], 10),
        minute: parseInt(val[1], 10),
        second: parseInt(val[2], 10) || 0
      }
    },

    __setHour (hour) {
      if (this.numberModel.hour !== hour) {
        this.numberModel.hour = hour
        this.numberModel.minute = null
        this.numberModel.second = null
      }
    },

    __setMinute (minute) {
      if (this.numberModel.minute !== minute) {
        this.numberModel.minute = minute
        this.numberModel.second = null
        this.withSeconds !== true && this.__updateValue({ minute })
      }
    },

    __setSecond (second) {
      this.numberModel.second !== second && this.__updateValue({ second })
    },

    __setAm () {
      !this.isAM && this.__updateValue({
        hour: this.numberModel.hour - 12
      })
    },

    __setPm () {
      this.isAM && this.__updateValue({
        hour: this.numberModel.hour + 12
      })
    },

    __setNow () {
      const now = new Date()
      this.__updateValue({
        hour: now.getHours(),
        minute: now.getMinutes(),
        second: now.getSeconds()
      })
      this.view = 'Hour'
    },

    __updateValue (obj) {
      const
        time = {
          ...this.numberModel,
          ...obj
        },
        val = Math.min(time.hour, 23) + ':' +
          this.__pad(Math.min(time.minute, 59)) +
          (this.withSeconds ? ':' + this.__pad(Math.min(time.second, 59)) : '')

      if (val !== this.value) {
        this.$emit('input', val)
      }
    }
  },

  render (h) {
    return h('div', {
      staticClass: 'q-time',
      'class': this.classes
    }, [
      this.__getHeader(h),
      this.__getClock(h)
    ])
  }
})