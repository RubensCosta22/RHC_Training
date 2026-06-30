export function youtubeSearchUrl(exerciseName) {
  const query = encodeURIComponent(`como fazer ${exerciseName} corretamente`)
  return `https://www.youtube.com/results?search_query=${query}`
}
