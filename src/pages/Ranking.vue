<template>
  <div class="ranking-container">
    <h1 class="title">랭킹</h1>

    <!-- 점수 기준 선택 (Total / Base) -->
    <div class="ranking-options">
      <button @click="setRankingType('total')" :class="{'active': rankingType === 'total'}">총 점수</button>
      <button @click="setRankingType('base')" :class="{'active': rankingType === 'base'}">최근 10일 점수</button>
    </div>

    <!-- 랭킹 리스트 출력 -->
    <div v-if="rankings.length > 0">
      <table class="table">
        <thead>
        <tr>
          <th>순위</th>
          <th>닉네임</th>
          <th>점수</th>
        </tr>
        </thead>
        <tbody>
        <tr v-for="(ranking, index) in rankings" :key="ranking.memberId">
          <td>{{ index + 1 }}</td>
          <td>
            <span v-if="index === 0" class="medal gold">🥇</span>
            <span v-if="index === 1" class="medal silver">🥈</span>
            <span v-if="index === 2" class="medal bronze">🥉</span>
            {{ ranking.userName }}
          </td>
          <td>{{ rankingType === 'total' ? ranking.totalScore : ranking.baseScore }}</td>
        </tr>
        </tbody>
      </table>
    </div>

    <!-- 데이터가 없을 경우 표시 -->
    <div v-else>
      <p>현재 랭킹 정보가 없습니다.</p>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  data() {
    return {
      rankingType: 'total',  // 랭킹 타입 (기본값: total)
      rankings: [],          // 랭킹 데이터를 저장할 배열
    };
  },
  mounted() {
    this.fetchRanking();  // 컴포넌트가 로드될 때 랭킹 데이터를 가져옵니다.
  },
  methods: {
    // 랭킹 타입을 변경하고 데이터를 다시 가져옵니다.
    setRankingType(type) {
      this.rankingType = type;
      this.fetchRanking();
    },

    // 선택된 랭킹 타입에 따라 데이터를 가져오는 함수
    async fetchRanking() {
      try {
        const response = await axios.get(`/api/ranking?type=${this.rankingType}&limit=10`);
        this.rankings = response.data;  // API 응답으로 받은 데이터를 랭킹 배열에 저장
      } catch (error) {
        alert('랭킹 데이터를 불러오는 중 오류가 발생했습니다.');
      }
    }
  }
};
</script>

<style scoped>
/* 구글 폰트 설정: Roboto */
@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');

/* 컨테이너 스타일 */
.ranking-container {
  margin: 20px;
  font-family: 'Roboto', sans-serif;
  background: #f5f6f7;
  color: #1c1e21;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

/* 제목 스타일 */
.title {
  font-size: 28px;
  text-align: center;
  margin-bottom: 30px;
  font-weight: 500;
  color: #1877f2;
}

/* 랭킹 옵션 버튼 스타일 */
.ranking-options {
  display: flex;
  justify-content: center;
  gap: 30px;
  margin-bottom: 20px;
}

.ranking-options button {
  padding: 12px 30px;
  background-color: #fff;
  color: #1877f2;
  border: 1px solid #1877f2;
  border-radius: 30px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.ranking-options button.active {
  background-color: #1877f2;
  color: #fff;
}

.ranking-options button:hover {
  background-color: #e4e6eb;
  transform: scale(1.05);
}

/* 테이블 스타일 */
.table {
  width: 100%;
  margin-top: 20px;
  border-collapse: collapse;
}

.table th,
.table td {
  padding: 12px 15px;
  text-align: center;
}

.table th {
  background-color: #f5f6f7;
  font-size: 16px;
  color: #1877f2;
}

.table td {
  background-color: #fff;
  font-size: 14px;
  border-bottom: 1px solid #e4e6eb;
}

.table tr:hover {
  background-color: #f1f2f6;
}

/* 메달 아이콘 스타일 */
.medal {
  font-size: 18px;
  margin-left: 5px;
}

.gold {
  color: #FFD700;
}

.silver {
  color: #C0C0C0;
}

.bronze {
  color: #CD7F32;
}

/* 데이터가 없을 경우 */
p {
  text-align: center;
  font-size: 18px;
  color: #333;
  font-weight: 500;
}
</style>
