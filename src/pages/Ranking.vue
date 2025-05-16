<template>
  <div class="feed-wrapper">
    <h1 class="header">랭킹</h1>

    <!-- 점수 기준 선택 (Total / Base) -->
    <div class="ranking-options">
      <button @click="setRankingType('total')" :class="{'active': rankingType === 'total'}">총 점수</button>
      <button @click="setRankingType('base')" :class="{'active': rankingType === 'base'}">최근 10일 점수</button>
    </div>

    <!-- 랭킹 리스트 출력 -->
    <div v-if="rankings.length > 0" class="rankings-container" ref="rankingsContainer">
      <div v-for="(ranking, index) in rankings" :key="ranking.memberId"
           class="ranking-card animate-on-scroll"
           :style="{ animationDelay: `${Math.min(index, 10) * 0.1}s` }">
        <div class="rank">
          <template v-if="ranking.rank === 1">
            <span class="medal gold">🥇</span>
          </template>
          <template v-else-if="ranking.rank === 2">
            <span class="medal silver">🥈</span>
          </template>
          <template v-else-if="ranking.rank === 3">
            <span class="medal bronze">🥉</span>
          </template>
          <template v-else>
            {{ ranking.rank }}
          </template>
        </div>

        <div class="profile-cell">
          <router-link :to="`/profile/${ranking.account}`" class="profile-link text-decoration-none">
            <!-- ProfileRing 컴포넌트 사용 -->
            <ProfileRing
              :profile-image-url="ranking.profileImageUrl"
              :base-score="ranking.baseScore || 0"
              :size="48"
              :stroke-width="3"
              progress-color="#a5d6a7"
              alt-text="프로필 이미지"
            />
          </router-link>
          <div class="user-details">
            <router-link :to="`/profile/${ranking.account}`" class="nickname-link">
              <span :class="{'bold-rank': ranking.rank <= 3}">{{ ranking.userName }}</span>
            </router-link>
            <span class="user-activity">{{ getActivityStatus(ranking.lastActiveDate) }}</span>
          </div>
        </div>

        <div class="score-container">
          <div class="score">
            {{ rankingType === 'total' ? ranking.totalScore : ranking.baseScore }}
          </div>
          <div class="trend" v-if="ranking.trend !== undefined">
            <span v-if="ranking.trend > 0" class="trend-up">↑ {{ ranking.trend }}</span>
            <span v-else-if="ranking.trend < 0" class="trend-down">↓ {{ Math.abs(ranking.trend) }}</span>
            <span v-else class="trend-same">―</span>
          </div>
        </div>
      </div>

      <!-- 추가 로딩 표시 -->
      <div v-if="isLoadingMore" class="loading-more">
        <div class="loading-spinner-small"></div>
        <p>더 불러오는 중...</p>
      </div>
      
      <!-- 모든 데이터 로딩 완료 표시 -->
      <div v-if="isLastPage && !isLoading" class="end-of-list">
        <div class="end-marker">
          <span>모든 랭킹을 불러왔습니다</span>
        </div>
      </div>
    </div>

    <!-- 초기 로딩 상태 표시 -->
    <div v-else-if="isLoading" class="loading-container animate-on-scroll">
      <div class="loading-spinner"></div>
      <p>랭킹 정보를 불러오는 중...</p>
    </div>

    <!-- 데이터가 없을 경우 표시 -->
    <div v-else class="no-rankings animate-on-scroll">
      <p>현재 랭킹 정보가 없습니다.</p>
    </div>
  </div>
</template>

<script>
import axios from 'axios';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import ProfileRing from '@/components/profile/ProfileRing.vue';

dayjs.extend(relativeTime);

export default {
  components: {
    ProfileRing
  },
  data() {
    return {
      rankingType: 'total',  // 랭킹 타입 (기본값: total)
      rankings: [],          // 랭킹 데이터를 저장할 배열
      isLoading: false,      // 초기 로딩 상태
      isLoadingMore: false,  // 추가 데이터 로딩 상태
      currentPage: 0,        // 현재 페이지 (0부터 시작)
      pageSize: 15,          // 페이지 크기
      totalPages: 0,         // 전체 페이지 수
      totalElements: 0,      // 전체 아이템 수
      isLastPage: false,     // 마지막 페이지 여부
      scrollThreshold: 200,  // 스크롤 임계값 (px)
      scrollListener: null   // 스크롤 이벤트 리스너
    };
  },
  mounted() {
    this.fetchRanking();     // 컴포넌트가 로드될 때 랭킹 데이터를 가져옵니다.
    this.setupInfiniteScroll(); // 무한 스크롤 설정
  },
  beforeUnmount() {
    this.removeScrollListener(); // 컴포넌트가 제거될 때 스크롤 리스너 제거
  },
  methods: {
    // 랭킹 타입을 변경하고 데이터를 다시 가져옵니다.
    setRankingType(type) {
      this.rankingType = type;
      // 초기화
      this.currentPage = 0;
      this.rankings = [];
      this.isLastPage = false;
      this.fetchRanking();   // 새 랭킹 데이터 가져오기
    },

    // 스크롤 이벤트 리스너 설정
    setupInfiniteScroll() {
      this.scrollListener = this.handleScroll.bind(this);
      window.addEventListener('scroll', this.scrollListener);
    },

    // 스크롤 이벤트 리스너 제거
    removeScrollListener() {
      if (this.scrollListener) {
        window.removeEventListener('scroll', this.scrollListener);
        this.scrollListener = null;
      }
    },

    // 스크롤 이벤트 핸들러
    handleScroll() {
      // 페이지 끝에 도달했는지 확인
      const bottom = Math.ceil(window.innerHeight + window.scrollY) >= document.documentElement.scrollHeight - this.scrollThreshold;
      
      // 페이지 끝에 도달하고 로딩 중이 아니며 마지막 페이지가 아닌 경우
      if (bottom && !this.isLoading && !this.isLoadingMore && !this.isLastPage) {
        this.loadMoreRankings();
      }
    },

    // 추가 랭킹 데이터 로드
    async loadMoreRankings() {
      if (this.isLastPage) return;
      
      this.isLoadingMore = true;
      this.currentPage++;
      
      try {
        await this.fetchRankingPage();
      } finally {
        this.isLoadingMore = false;
      }
    },

    // 선택된 랭킹 타입에 따라 데이터를 가져오는 함수 (초기 로드)
    async fetchRanking() {
      this.isLoading = true;
      this.currentPage = 0;
      
      try {
        await this.fetchRankingPage();
        
        this.$nextTick(() => {
          this.observeFeedAnimation(); // 데이터가 로드된 후 애니메이션 다시 설정
        });
      } catch (error) {
        console.error('랭킹 데이터를 불러오는 중 오류가 발생했습니다.', error);
      } finally {
        this.isLoading = false;
      }
    },
    
    // 페이지 데이터 가져오기 (공통 로직)
    async fetchRankingPage() {
      try {
        const response = await axios.get(
          `/api/ranking?type=${this.rankingType}&page=${this.currentPage}&size=${this.pageSize}`
        );
        
        // 서버가 Page 객체를 반환하므로 그에 맞게 처리
        const pageData = response.data;
        
        // 가상의 트렌드 데이터 추가 (실제 API에서 제공되면 이 부분 제거)
        const newRankings = pageData.content.map(item => ({
          ...item,
          trend: this.getRandomTrend(), // 실제 API에서는 제거하고 서버에서 제공하는 값 사용
          lastActiveDate: this.getRandomDate() // 실제 API에서는 제거하고 서버에서 제공하는 값 사용
        }));

        // 기존 데이터에 새 데이터 추가 (첫 페이지인 경우 덮어쓰기)
        if (this.currentPage === 0) {
          this.rankings = newRankings;
        } else {
          this.rankings = [...this.rankings, ...newRankings];
        }
        
        this.totalPages = pageData.totalPages;
        this.totalElements = pageData.totalElements;
        this.isLastPage = pageData.last;
        
        this.$nextTick(() => {
          this.observeFeedAnimation(); // 새 데이터가 로드된 후 애니메이션 다시 설정
        });
        
      } catch (error) {
        console.error(`페이지 ${this.currentPage} 랭킹 데이터를 불러오는 중 오류가 발생했습니다.`, error);
        this.currentPage = Math.max(0, this.currentPage - 1); // 오류 발생 시 페이지 번호 복구
      }
    },

    // 스크롤 애니메이션 관찰자 설정
    observeFeedAnimation() {
      const elements = document.querySelectorAll(".animate-on-scroll:not(.in-view)");
      if (elements.length === 0) return;
      
      const scrollObserver = new IntersectionObserver(
          entries => entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add("in-view");
          }),
          {threshold: 0.1}
      );
      elements.forEach(el => scrollObserver.observe(el));
    },

    // 활동 상태 표시 (최근 활동 시간 기준)
    getActivityStatus(date) {
      if (!date) return '';
      return dayjs(date).fromNow();
    },

    // 임시 데이터용 랜덤 트렌드 생성 (실제 구현 시 제거)
    getRandomTrend() {
      const trends = [-2, -1, 0, 1, 2, 3];
      return trends[Math.floor(Math.random() * trends.length)];
    },

    // 임시 데이터용 랜덤 날짜 생성 (실제 구현 시 제거)
    getRandomDate() {
      const days = [0, 1, 2, 3, 4, 5];
      const randomDay = days[Math.floor(Math.random() * days.length)];
      return dayjs().subtract(randomDay, 'day').toISOString();
    }
  }
};
</script>

<style scoped>
/* 기본 레이아웃 및 애니메이션 */
.feed-wrapper {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.animate-on-scroll {
  opacity: 0;
  transform: translateY(40px);
  transition: all 0.8s ease;
}

.animate-on-scroll.in-view {
  opacity: 1;
  transform: translateY(0);
}

.header {
  font-size: 28px;
  font-weight: bold;
  color: #222;
  text-align: left;
  margin-bottom: 24px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e6e6e6;
}

/* 랭킹 옵션 버튼 */
.ranking-options {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-bottom: 24px;
  position: sticky;
  top: 0;
  z-index: 100;
  background-color: #fff;
  padding: 10px 0;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  border-radius: 0 0 12px 12px;
}

.ranking-options button {
  padding: 8px 20px;
  background-color: #fff;
  color: #666;
  border: 1px solid #ddd;
  border-radius: 20px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.ranking-options button.active {
  background-color: #f0f0f0;
  color: #333;
  border-color: #ccc;
  font-weight: bold;
}

.ranking-options button:hover {
  background-color: #f9f9f9;
  transform: translateY(-2px);
}

/* 로딩 스타일 */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  margin-top: 20px;
}

.loading-more {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 0;
  color: #999;
  font-size: 14px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 10px;
}

.loading-spinner-small {
  width: 24px;
  height: 24px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 8px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 랭킹 카드 스타일 */
.rankings-container {
  margin-top: 20px;
}

.ranking-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  margin-bottom: 16px;
  overflow: hidden;
  padding: 14px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.ranking-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
}

/* 상위 랭커(1-3등)에 대한 특별한 호버 효과 */
.ranking-card:nth-child(-n+3) {
  position: relative;
  z-index: 1;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.ranking-card:nth-child(-n+3):hover {
  transform: translateY(-2px) scale(1.025);
  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.2);
  z-index: 10;
}

/* 1등 */
.ranking-card:nth-child(1):hover {
  box-shadow: 0 5px 15px rgba(255, 193, 7, 0.3);
  border-color: #ffc107;
}

/* 2등 */
.ranking-card:nth-child(2):hover {
  box-shadow: 0 5px 15px rgba(57, 73, 171, 0.4);
  border-color: #3949ab;
}

/* 3등 */
.ranking-card:nth-child(3):hover {
  box-shadow: 0 5px 15px rgba(205, 127, 50, 0.3);
  border-color: #cd7f32;
}


.ranking-card:nth-child(-n+3):hover::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  border: 2px solid transparent;
  animation: shine 1.5s linear infinite;
  pointer-events: none;
  z-index: -1;
}

@keyframes shine {
  0% {
    border-color: rgba(255, 255, 255, 0.1);
    box-shadow: 0 0 5px rgba(255, 255, 255, 0.1);
  }
  50% {
    border-color: rgba(255, 255, 255, 0.8);
    box-shadow: 0 0 20px rgba(255, 255, 255, 0.8);
  }
  100% {
    border-color: rgba(255, 255, 255, 0.1);
    box-shadow: 0 0 5px rgba(255, 255, 255, 0.1);
  }
}

/* 순위 스타일 */
.rank {
  font-size: 18px;
  font-weight: bold;
  width: 40px;
  text-align: center;
  color: #555;
}

.medal {
  font-size: 24px;
  display: inline-block;
  transform-origin: center;
  animation: pulse 2s infinite;
}

/* 메달 애니메이션 확장 */
@keyframes pulse {
  0% {
    transform: scale(1.0);
  }
  50% {
    transform: scale(1.15);
  }
  100% {
    transform: scale(1.0);
  }
}

/* 1등 (진한 금색) */
.gold {
  color: #FFD700; /* 황금색 */
  text-shadow: 0 0 10px rgba(255, 215, 0, 0.8); /* 진한 빛 효과 */
}

/* 2등 (사파이어 블루) */
.silver {
  color: #3949ab; /* 깊고 차가운 사파이어 블루 */
  text-shadow: 0 0 10px rgba(57, 73, 171, 0.7); /* 고급스러움 강조 */
}

/* 3등 (진한 브론즈) */
.bronze {
  color: #9e7a38; /* 진한 브론즈 색상 */
  text-shadow: 0 0 10px rgba(158, 122, 56, 0.7); /* 깊은 브론즈 느낌 강조 */
}

/* 상위 랭커의 메달 호버 효과 */
.ranking-card:nth-child(1):hover .medal.gold {
  transform: scale(1.3);
  color: #FFD700; /* 황금색 */
  text-shadow: 0 0 15px rgba(255, 215, 0, 0.8); /* 진한 빛 효과 */
  transition: transform 0.4s ease-out;
}

.ranking-card:nth-child(2):hover .medal.silver {
  transform: scale(1.3);
  color: #3949ab;
  text-shadow: 0 0 10px rgba(57, 73, 171, 0.7);
  transition: all 0.4s ease-out;
}

.ranking-card:nth-child(3):hover .medal.bronze {
  transform: scale(1.3);
  color: #9e7a38; /* 진한 브론즈 색상 */
  text-shadow: 0 0 15px rgba(158, 122, 56, 0.7);
  transition: transform 0.4s ease-out;
}

/* 프로필 및 사용자 정보 */
.profile-cell {
  display: flex;
  align-items: center;
  flex: 1;
  gap: 12px;
  padding: 0 10px;
}

/* ProfileRing 컴포넌트용 스타일 */
.profile-link {
  text-decoration: none;
  flex-shrink: 0;
}

.user-details {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.user-activity {
  font-size: 12px;
  color: #999;
  margin-top: 2px;
}

/* 점수 및 추세 표시 */
.score-container {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  min-width: 70px;
}

.score {
  font-weight: bold;
  font-size: 18px;
  color: #333;
}

.trend {
  font-size: 12px;
  margin-top: 4px;
}

.trend-up {
  color: #ff6b6b;
}

.trend-down {
  color: #339af0;
}

.trend-same {
  color: #999;
}

/* 닉네임 스타일 */
.nickname-link {
  text-decoration: none;
  color: #333;
  font-size: 16px;
  transition: color 0.3s ease;
}

.nickname-link:hover {
  color: #555;
}

.bold-rank {
  font-weight: 700;
}

/* 목록 끝 표시 */
.end-of-list {
  padding: 20px 0;
  text-align: center;
}

.end-marker {
  display: inline-block;
  padding: 8px 20px;
  background-color: #f9f9f9;
  border-radius: 20px;
  font-size: 14px;
  color: #999;
  box-shadow: 0 2px 5px rgba(0,0,0,0.05);
}

/* 데이터가 없을 경우 스타일 */
.no-rankings {
  text-align: center;
  padding: 40px;
  color: #999;
  font-size: 1rem;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  margin-top: 20px;
}

/* 모바일 최적화 */
@media (max-width: 768px) {
  .feed-wrapper {
    padding: 15px;
  }
  
  .header {
    font-size: 24px;
    margin-bottom: 16px;
  }
  
  .ranking-options {
    gap: 10px;
  }
  
  .ranking-options button {
    padding: 6px 16px;
    font-size: 13px;
  }
  
  .ranking-card {
    padding: 12px;
  }
  
  .score {
    font-size: 16px;
  }
}
</style>