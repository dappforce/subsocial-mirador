import { LoadingOutlined } from '@ant-design/icons'
import { parseDomain } from '@subsocial/utils'
import { Divider } from 'antd'
import BN from 'bignumber.js'
import clsx from 'clsx'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import { FC, HTMLProps, useMemo } from 'react'
import {
  CardWithTitle as InnerCardWithTitle,
  CardWithTitleProps,
} from 'src/components/utils/cards/WithTitle'
import config from 'src/config'
import { useCreateRemovePendingOrders } from 'src/rtk/features/domainPendingOrders/pendingOrdersHooks'
import { useCreateUpsertDomains } from 'src/rtk/features/domains/domainHooks'
import { useSelectSellerConfig } from 'src/rtk/features/sellerConfig/sellerConfigHooks'
import useSubsocialEffect from '../api/useSubsocialEffect'
import { useMyAddress } from '../auth/MyAccountsContext'
import { slugifyHandle } from '../urls/helpers'
import { useAddClassNameToRootElement } from '../utils'
import { controlledMessage } from '../utils/Message'
import styles from './index.module.sass'
import { DomainSellerKind, useManageDomainContext } from './manage/ManageDomainProvider'

dayjs.extend(utc)

const BLOCK_TIME = 12
const SECS_IN_DAY = 60 * 60 * 24
export const BLOCKS_IN_YEAR = new BN((SECS_IN_DAY * 365) / BLOCK_TIME)

const { resolvedDomain } = config

type ResultContainerProps = Omit<HTMLProps<HTMLDivElement>, 'title'> & {
  title: React.ReactNode
  icon: JSX.Element
  rightElement?: React.ReactNode
  withDivider?: boolean
}

export const ResultContainer = ({
  title,
  className,
  icon,
  children,
  rightElement,
  withDivider,
  ...props
}: ResultContainerProps) => {
  return (
    <div className={clsx('d-flex flex-column', className)}>
      <div className='d-flex align-items-center justify-content-between w-100'>
        <h2 {...props} className={clsx('d-flex align-items-center mb-0 ColorCurrentColor')}>
          {icon && <div className='mr-2 d-flex'>{icon}</div>}
          {title}
        </h2>
        {rightElement}
      </div>
      {withDivider && <Divider className='w-100 m-0 mt-3 mb-3' />}
      <div className='d-flex flex-column GapNormal'>{children}</div>
    </div>
  )
}

export const CardWithTitle: FC<CardWithTitleProps> = props => (
  <InnerCardWithTitle {...props} cardClassName={styles.DomainResults} />
)

export const getTime = (miliseconds?: number) => {
  if (!miliseconds) return '-'

  return miliseconds / 60 / 1000
}

export const useAddAstronautBg = () => useAddClassNameToRootElement('astronaut-bg')

export type DomainStruct = {
  owner: string
  outerValue?: string
  expiresAt: string
  soldFor: string
  innerSpace?: string
}

export type DomainDetails = DomainStruct & {
  id: string
}

export const cutResolvedDomain = (maybeHandle?: string) => {
  const tldForResolve = '.' + resolvedDomain

  return maybeHandle?.endsWith(tldForResolve)
    ? maybeHandle?.substr(0, maybeHandle?.length - tldForResolve.length)
    : maybeHandle
}

export const slugifyDomain = (maybeHandle?: string) => {
  const tldForResolve = '.' + resolvedDomain

  return slugifyHandle(
    maybeHandle?.endsWith(tldForResolve)
      ? maybeHandle?.substr(0, maybeHandle?.length - tldForResolve.length)
      : maybeHandle,
  )
}

export const resolveDomain = (maybeHandle: string) => {
  const { domain, tld = config.resolvedDomain } = parseDomain(maybeHandle)

  return `${domain.replace(/[^a-z0-9-]/g, '')}.${tld}`
}

export const UnamesLearnMoreLink = ({ className, ...props }: HTMLProps<HTMLAnchorElement>) => {
  return (
    <a
      {...props}
      className={clsx(className)}
      href='https://docs.subsocial.network/docs/tutorials/usernames'
      target='_blank'
      rel='noreferrer'
    >
      <span style={{ whiteSpace: 'nowrap' }}>Learn More</span>
    </a>
  )
}

const waitMessage = controlledMessage({
  message: 'Waiting for domain registration',
  type: 'info',
  duration: 0,
  icon: <LoadingOutlined />,
})

export const useFetchNewDomains = (domainName?: string) => {
  const myAddress = useMyAddress()
  const { setIsFetchNewDomains, isFetchNewDomains, openManageModal, setProcessingDomains } =
    useManageDomainContext()
  const upsertDomains = useCreateUpsertDomains()
  const removePendingOrder = useCreateRemovePendingOrders()

  useSubsocialEffect(
    ({ substrate }) => {
      setIsFetchNewDomains(false)
      if (!myAddress || !isFetchNewDomains || !domainName) return

      let unsub: any

      const subscription = async () => {
        const api = await (await substrate.api).isReady
        waitMessage.open()

        unsub = await api.query.domains.registeredDomains(domainName, data => {
          const domain = data.unwrapOr(undefined)

          if (domain) {
            const domainEntity = {
              id: domainName,
              ...(domain as unknown as DomainStruct),
            }

            upsertDomains({ domain: domainEntity, address: myAddress, domainName })
            removePendingOrder({ domainName })
            setProcessingDomains({ [domainName]: false })
            waitMessage.close()
            openManageModal('success', domainName)
          }
        })
      }

      subscription().catch(err => console.error(err))

      return () => unsub && unsub()
    },
    [isFetchNewDomains, myAddress],
  )
}

export const useGetPrice = (domainPrice: string, domainSellerKind: DomainSellerKind) => {
  const sellerConfig = useSelectSellerConfig()
  const { domainRegistrationPriceFactor } = sellerConfig || {}

  const isSub = domainSellerKind === 'SUB'

  const price = useMemo(() => {
    if (isSub) {
      return domainPrice
    } else {
      if (!domainRegistrationPriceFactor || !domainPrice) return '0'
      return new BN(domainPrice).multipliedBy(new BN(domainRegistrationPriceFactor)).toString()
    }
  }, [isSub, domainPrice, domainRegistrationPriceFactor])

  return price
}
