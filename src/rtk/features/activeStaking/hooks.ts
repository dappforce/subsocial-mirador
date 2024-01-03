import { useMyAddress } from 'src/components/auth/MyAccountsContext'
import { useFetchWithoutApi } from 'src/rtk/app/hooksCommon'
import { useAppSelector } from 'src/rtk/app/store'
import {
  fetchAddressLikeCountSlice,
  getAddressLikeCountId,
  selectAddressLikeCount,
} from './addressLikeCountSlice'
import { fetchRewardHistory, selectUserRewardHistory } from './rewardHistorySlice'
import { selectUserRewardReport } from './rewardReportSlice'
import { selectPostSuperLikeCount } from './superLikeCountsSlice'

export function useSuperLikeCount(postId: string) {
  return useAppSelector(state => selectPostSuperLikeCount(state, postId)?.count ?? 0)
}

export const useFetchMySuperLikesByPostIds = (postIds: string[]) => {
  const myAddress = useMyAddress()
  return useFetchWithoutApi(
    fetchAddressLikeCountSlice,
    { postIds, address: myAddress ?? '' },
    { enabled: !!myAddress && postIds.length > 0 },
  )
}

export function useHasISuperLikedPost(postId: string) {
  const myAddress = useMyAddress() ?? ''
  return useAppSelector(state => {
    const entity = selectAddressLikeCount(
      state,
      getAddressLikeCountId({ address: myAddress, postId }),
    )
    return (entity?.count ?? 0) > 0
  })
}

export function useFetchUserRewardReport(address?: string) {
  const myAddress = useMyAddress()
  const usedAddress = address || myAddress || ''

  const data = useAppSelector(state => selectUserRewardReport(state, usedAddress))
  const fetchData = useFetchWithoutApi(
    fetchRewardHistory,
    { address: usedAddress },
    { enabled: !!usedAddress },
  )

  return {
    ...fetchData,
    data,
  }
}

export function useFetchUserRewardHistory(address?: string, config?: { enabled?: boolean }) {
  const { enabled } = config || {}
  const myAddress = useMyAddress()
  const usedAddress = address || myAddress || ''

  const data = useAppSelector(state => selectUserRewardHistory(state, usedAddress))
  console.log('enabled', !!usedAddress && enabled !== false)
  const fetchData = useFetchWithoutApi(
    fetchRewardHistory,
    { address: usedAddress },
    { enabled: !!usedAddress && enabled !== false },
  )

  return {
    ...fetchData,
    data,
  }
}
