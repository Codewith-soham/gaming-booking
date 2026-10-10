import { OperationalStatus as S, ResourceType as T } from '../utils/constants'

const pad = (n) => String(n).padStart(2, '0')

function make({ hubId, branchId, key, type, label, count, rate, specs, overrides = {} }) {
  return Array.from({ length: count }, (_, i) => {
    const n = i + 1
    return {
      id: `res_${key}${pad(n)}`,
      hubId,
      branchId,
      name: `${label}-${pad(n)}`,
      type,
      specifications: specs,
      hourlyRate: rate,
      operationalStatus: overrides[n] ?? S.AVAILABLE,
      isActive: true,
    }
  })
}

const PC_SPEC = 'RTX 4060, 165Hz monitor'
const PS5_SPEC = 'PS5, 4K TV, 2 controllers'

// Ids: res_<branch>_<type><nn>, e.g. res_kp_pc01.
export const resources = [
  ...make({
    hubId: 'hub_pixel',
    branchId: 'br_kp',
    key: 'kp_pc',
    type: T.PC,
    label: 'PC',
    count: 6,
    rate: 80,
    specs: PC_SPEC,
    overrides: { 5: S.MAINTENANCE, 6: S.OFFLINE },
  }),
  ...make({
    hubId: 'hub_pixel',
    branchId: 'br_kp',
    key: 'kp_ps5',
    type: T.PS5,
    label: 'PS5',
    count: 2,
    rate: 150,
    specs: PS5_SPEC,
  }),
  ...make({
    hubId: 'hub_pixel',
    branchId: 'br_kp',
    key: 'kp_xbox',
    type: T.XBOX,
    label: 'Xbox',
    count: 1,
    rate: 150,
    specs: 'Xbox Series X, 4K TV',
  }),
  ...make({
    hubId: 'hub_pixel',
    branchId: 'br_baner',
    key: 'baner_pc',
    type: T.PC,
    label: 'PC',
    count: 4,
    rate: 70,
    specs: 'RTX 3060, 144Hz monitor',
  }),
  ...make({
    hubId: 'hub_pixel',
    branchId: 'br_baner',
    key: 'baner_racing',
    type: T.RACING_SIMULATOR,
    label: 'Racing Simulator',
    count: 1,
    rate: 250,
    specs: 'Wheel, pedals, motion seat',
  }),
  ...make({
    hubId: 'hub_nova',
    branchId: 'br_nova',
    key: 'nova_pc',
    type: T.PC,
    label: 'PC',
    count: 5,
    rate: 100,
    specs: 'RTX 4070, 240Hz monitor',
  }),
  ...make({
    hubId: 'hub_nova',
    branchId: 'br_nova',
    key: 'nova_ps5',
    type: T.PS5,
    label: 'PS5',
    count: 2,
    rate: 160,
    specs: PS5_SPEC,
  }),
  ...make({
    hubId: 'hub_nova',
    branchId: 'br_nova',
    key: 'nova_vr',
    type: T.VR,
    label: 'VR',
    count: 1,
    rate: 300,
    specs: 'Standalone headset, 3m x 3m play area',
  }),
  ...make({
    hubId: 'hub_rift',
    branchId: 'br_rift',
    key: 'rift_racing',
    type: T.RACING_SIMULATOR,
    label: 'Racing Simulator',
    count: 2,
    rate: 300,
    specs: 'Direct-drive wheel, triple screen',
  }),
  ...make({
    hubId: 'hub_rift',
    branchId: 'br_rift',
    key: 'rift_vr',
    type: T.VR,
    label: 'VR',
    count: 2,
    rate: 350,
    specs: 'PC VR headset, 3m x 3m play area',
  }),
  ...make({
    hubId: 'hub_rift',
    branchId: 'br_rift',
    key: 'rift_ps5',
    type: T.PS5,
    label: 'PS5',
    count: 1,
    rate: 150,
    specs: PS5_SPEC,
  }),
]
