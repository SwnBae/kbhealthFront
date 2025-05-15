<template>
  <img class="rabbit" :src="currentSrc" alt="Rabbit Animation" />
</template>

<script>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'

// 애니메이션 상수
const FRAME_DELAY = 60 // 기본 프레임 딜레이 (ms)
const ANIMATIONS = {
  ID: 'id',
  PW: 'pw',
  SUCCESS: 'success'
}

export default {
  name: 'RabbitAnimation',
  props: {
    idLength: { type: Number, default: 0 },
    pwFocused: { type: Boolean, default: false },
    loginSuccess: { type: Boolean, default: false },
    // 새로운 prop: 애니메이션 속도 조절
    speed: { type: Number, default: 1 }
  },
  setup(props, { emit }) {
    // 애니메이션 프레임 저장소
    const frames = {
      [ANIMATIONS.ID]: [],
      [ANIMATIONS.PW]: [],
      [ANIMATIONS.SUCCESS]: []
    }

    // 현재 이미지 소스
    const currentSrc = ref('')
    
    // 현재 실행 중인 애니메이션 상태
    const currentAnimation = ref(null)
    
    // 애니메이션 취소 ID 저장소
    let animationFrameId = null
    let lastFrameTime = 0

    /**
     * 모든 이미지 프리로드
     */
    async function preloadImages() {
      try {
        // ID 애니메이션 프레임 로드
        for (let i = 1; i <= 10; i++) {
          frames[ANIMATIONS.ID].push(require(`@/assets/img/rabbit/rabbitid${i}.png`))
        }
        
        // PW 애니메이션 프레임 로드
        for (let i = 1; i <= 16; i++) {
          frames[ANIMATIONS.PW].push(require(`@/assets/img/rabbit/rabbitpw${i}.png`))
        }
        
        // 성공 애니메이션 프레임 로드
        for (let i = 1; i <= 25; i++) {
          frames[ANIMATIONS.SUCCESS].push(require(`@/assets/img/rabbit/rabbitgohome${i}.png`))
        }
        
        // 초기 이미지 설정
        currentSrc.value = frames[ANIMATIONS.ID][0]
      } catch (error) {
        console.error('이미지 로드 중 오류 발생:', error)
      }
    }

    /**
     * 애니메이션 정리 함수
     */
    function clearAnimation() {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
        animationFrameId = null
      }
      currentAnimation.value = null
    }

    /**
     * 제네릭 애니메이션 플레이어
     * @param {Array} frameList - 재생할 프레임 배열
     * @param {Number} startIdx - 시작 인덱스
     * @param {Number} endIdx - 종료 인덱스
     * @param {Function} onComplete - 완료 시 콜백
     */
    function playAnimation(frameList, startIdx, endIdx, onComplete) {
      clearAnimation()
      
      const frameCount = frameList.length
      
      // 유효한 시작/종료 인덱스 확인
      startIdx = Math.max(0, Math.min(startIdx, frameCount - 1))
      endIdx = Math.max(0, Math.min(endIdx, frameCount - 1))
      
      // 방향 결정 (앞으로/뒤로)
      const direction = startIdx <= endIdx ? 1 : -1
      let currentIdx = startIdx
      
      const frameDelay = FRAME_DELAY / Math.max(0.5, Math.min(2, props.speed))
      
      const animate = (timestamp) => {
        if (!lastFrameTime || timestamp - lastFrameTime >= frameDelay) {
          // 현재 프레임 표시
          currentSrc.value = frameList[currentIdx]
          
          // 다음 프레임으로 이동
          currentIdx += direction
          lastFrameTime = timestamp
          
          // 애니메이션 종료 확인
          if ((direction > 0 && currentIdx > endIdx) || 
              (direction < 0 && currentIdx < endIdx)) {
            if (onComplete) onComplete()
            clearAnimation()
            return
          }
        }
        
        // 다음 프레임 요청
        animationFrameId = requestAnimationFrame(animate)
      }
      
      // 첫 프레임 요청
      lastFrameTime = 0
      animationFrameId = requestAnimationFrame(animate)
    }

    /**
     * 눈 가리기 애니메이션 재생
     */
    function playHideEyes() {
      currentAnimation.value = ANIMATIONS.PW
      playAnimation(
        frames[ANIMATIONS.PW], 
        0, 
        frames[ANIMATIONS.PW].length - 1,
        null
      )
    }

    /**
     * 눈 보이기 애니메이션 재생
     */
    function playRevealEyes() {
      currentAnimation.value = ANIMATIONS.PW
      playAnimation(
        frames[ANIMATIONS.PW], 
        frames[ANIMATIONS.PW].length - 1, 
        0,
        () => {
          // 종료 후 ID 모드로 복귀
          updateIdFrame()
          currentAnimation.value = ANIMATIONS.ID
        }
      )
    }

    /**
     * 로그인 성공 애니메이션 재생
     */
    function playLoginSuccess() {
      currentAnimation.value = ANIMATIONS.SUCCESS
      playAnimation(
        frames[ANIMATIONS.SUCCESS], 
        0, 
        frames[ANIMATIONS.SUCCESS].length - 1,
        () => emit('animation-end')
      )
    }

    /**
     * ID 입력 길이에 따른 프레임 업데이트
     */
    function updateIdFrame() {
      if (currentAnimation.value === ANIMATIONS.PW) return
      if (props.loginSuccess) return
      
      // 부드러운 전환을 위한 ID 프레임 계산
      const maxFrames = frames[ANIMATIONS.ID].length - 1
      const frameIndex = Math.min(Math.floor(props.idLength / 2), maxFrames)
      
      currentSrc.value = frames[ANIMATIONS.ID][frameIndex]
    }

    // 컴포넌트 마운트 시 이미지 로드
    onMounted(() => {
      preloadImages()
    })

    // 컴포넌트 언마운트 시 정리
    onBeforeUnmount(() => {
      clearAnimation()
    })

    // props 변화 감지
    watch(() => props.pwFocused, (focused) => {
      if (props.loginSuccess) return
      focused ? playHideEyes() : playRevealEyes()
    })

    watch(() => props.idLength, () => {
      updateIdFrame()
    })

    watch(() => props.loginSuccess, (success) => {
      if (success) playLoginSuccess()
    })

    return { 
      currentSrc
    }
  }
}
</script>

<style scoped>
.rabbit {
  width: 120px;
  height: auto;
  display: block;
  margin: 0 auto 1rem;
  will-change: transform; /* 성능 최적화를 위한 힌트 */
}

/* 선택적 미디어 쿼리 추가 - 모바일 대응 */
@media (max-width: 768px) {
  .rabbit {
    width: 100px;
  }
}
</style>