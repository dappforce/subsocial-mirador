import { PostStruct } from '@subsocial/api/types'
import { toSubsocialAddress } from '@subsocial/utils'
import { useMemo } from 'react'
import { useMyAddress } from 'src/components/auth/MyAccountsContext'
import { appId } from 'src/config/env'
import { useFetchWithoutApi } from 'src/rtk/app/hooksCommon'
import { useAppSelector } from 'src/rtk/app/store'
import { fetchBlockedResources, selectBlockedResources } from './blockedResourcesSlice'
import { fetchModerator, selectModerator } from './moderatorSlice'

export function useFetchModerator(address: string) {
  const data = useAppSelector(state => selectModerator(state, address))
  const fetchData = useFetchWithoutApi(fetchModerator, { address: address }, { enabled: !!address })

  return {
    ...fetchData,
    data,
  }
}

export function useIsAdmin() {
  const myAddress = useMyAddress()
  const { data: moderator } = useFetchModerator(myAddress)
  return moderator?.appIds.includes(appId)
}

export function useFetchBlockedResourcesInApp() {
  const data = useAppSelector(state => selectBlockedResources(state, appId))
  const fetchData = useFetchWithoutApi(fetchBlockedResources, { appId }, { enabled: !!appId })

  return {
    ...fetchData,
    data,
  }
}

export function useIsPostBlocked(post: PostStruct) {
  const { data, loading } = useFetchBlockedResourcesInApp()
  const ownerId = post.ownerId
  const cid = post.contentId
  const postId = post.id

  const isBlocked = useMemo(() => {
    return (
      data?.resources.address.includes(toSubsocialAddress(ownerId ?? '') ?? '') ||
      data?.resources.cid.includes(cid ?? '') ||
      data?.resources.postId.includes(postId ?? '')
    )
  }, [data, ownerId, cid, postId])

  if (loading) return true

  return isBlocked
}

export function useIsBlocked(address: string) {
  const { data, loading } = useFetchBlockedResourcesInApp()

  const isBlocked = useMemo(() => {
    return data?.resources.address.includes(toSubsocialAddress(address ?? '') ?? '')
  }, [data, address])

  if (loading) return true

  return isBlocked
}
