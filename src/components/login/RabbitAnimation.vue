<template>
  <img class="rabbit" :src="currentSrc" alt="Rabbit Animation" />
</template>

<script>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'

export default {
  name: 'RabbitAnimation',
  props: {
    idLength:    { type: Number,  default: 0 },
    pwFocused:   { type: Boolean, default: false },
    loginSuccess:{ type: Boolean, default: false }
  },
  setup(props, { emit }) {
    // frame arrays
    const idFrames = []
    const pwFrames = []
    const successFrames = []

    // current image src
    const currentSrc = ref('')

    // timers
    let pwTimer = null
    let revealTimer = null
    let successTimer = null

    // preload all frames
    function preload() {
      for (let i = 1; i <= 10; i++) {
        idFrames.push(require(`@/assets/img/rabbit/rabbitid${i}.png`))
      }
      for (let i = 1; i <= 16; i++) {
        pwFrames.push(require(`@/assets/img/rabbit/rabbitpw${i}.png`))
      }
      for (let i = 1; i <= 25; i++) {
        successFrames.push(require(`@/assets/img/rabbit/rabbitgohome${i}.png`))
      }
    }

    // clear running timers
    function clearTimers() {
      clearTimeout(pwTimer)
      clearTimeout(revealTimer)
      clearTimeout(successTimer)
    }

    // play hide-eyes animation
    function playHide() {
      clearTimers()
      let i = 0
      const step = () => {
        if (i < pwFrames.length) {
          currentSrc.value = pwFrames[i]
          i++
          pwTimer = setTimeout(step, 60)
        }
      }
      step()
    }

    // play reveal-eyes animation
    function playReveal() {
      clearTimers()
      let i = pwFrames.length - 1
      const step = () => {
        if (i >= 0) {
          currentSrc.value = pwFrames[i]
          i--
          revealTimer = setTimeout(step, 60)
        } else {
          // 끝나면 ID 프레임으로 복귀
          const idx = Math.min(Math.floor(props.idLength), idFrames.length - 1)
          currentSrc.value = idFrames[idx]
        }
      }
      step()
    }

    // play login success animation
    function playSuccess() {
      clearTimers()
      let i = 0
      const step = () => {
        if (i < successFrames.length) {
          currentSrc.value = successFrames[i]
          i++
          successTimer = setTimeout(step, 60)
        } else {
          emit('animation-end')
        }
      }
      step()
    }

    onMounted(() => {
      preload()
      // 초기 화면: ID 첫 프레임
      currentSrc.value = idFrames[0]
    })

    onBeforeUnmount(() => {
      clearTimers()
    })

    // props 변화 감지
    watch(() => props.pwFocused, (focused) => {
      if (props.loginSuccess) return
      focused ? playHide() : playReveal()
    })

    watch(() => props.idLength, (len) => {
      if (!props.pwFocused && !props.loginSuccess) {
        const idx = Math.min(Math.floor(len), idFrames.length - 1)
        currentSrc.value = idFrames[idx]
      }
    })

    watch(() => props.loginSuccess, (ok) => {
      if (ok) playSuccess()
    })

    return { currentSrc }
  }
}
</script>

<style scoped>
.rabbit {
  width: 120px;
  height: auto;
  display: block;
  margin: 0 auto 1rem;
}
</style>