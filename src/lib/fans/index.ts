import { VeSyncAirBypass } from './airBypass';
import { VeSyncAirBaseV2 } from './airBaseV2';
import { VeSyncAir131 } from './air131';
import { VeSyncTowerFan } from './towerFan';
import { VeSyncHumidifier } from './humidifier';
import { VeSyncWarmHumidifier } from './warmHumidifier';
import { VeSyncHumid200300S } from './humid200300S';
import { VeSyncSuperior6000S } from './superior6000S';
import { VeSyncHumid1000S } from './humid1000S';
import { VeSyncHumid200S } from './humid200S';
import { VeSyncFan } from '../vesyncFan';
import { VeSync } from '../vesync';

// Re-export all classes
export { VeSyncAirBypass } from './airBypass';
export { VeSyncAirBaseV2 } from './airBaseV2';
export { VeSyncAir131 } from './air131';
export { VeSyncTowerFan } from './towerFan';
export { VeSyncHumidifier } from './humidifier';
export { VeSyncWarmHumidifier } from './warmHumidifier';
export { VeSyncHumid200300S } from './humid200300S';
export { VeSyncSuperior6000S } from './superior6000S';
export { VeSyncHumid1000S } from './humid1000S';
export { VeSyncHumid200S } from './humid200S';

// Export fan modules dictionary
export const fanModules: Record<string, new (details: Record<string, any>, manager: VeSync) => VeSyncFan> = {
    // Core Series
    'Core200S': VeSyncAirBypass,
    'Core300S': VeSyncAirBypass,
    'Core400S': VeSyncAirBypass,
    'Core600S': VeSyncAirBypass,
    
    // LAP Series
    'LAP-C201S-AUSR': VeSyncAirBypass,
    'LAP-C202S-WUSR': VeSyncAirBypass,
    'LAP-C301S-WJP': VeSyncAirBypass,
    'LAP-C302S-WUSB': VeSyncAirBypass,
    'LAP-C301S-WAAA': VeSyncAirBypass,
    'LAP-C401S-WJP': VeSyncAirBypass,
    'LAP-C401S-WUSR': VeSyncAirBypass,
    'LAP-C401S-WAAA': VeSyncAirBypass,
    'LAP-C601S-WUS': VeSyncAirBypass,
    'LAP-C601S-WUSR': VeSyncAirBypass,
    'LAP-C601S-WEU': VeSyncAirBypass,
    
    // Vital100S Series - Using VeSyncAirBaseV2
    'LAP-V102S-AASR': VeSyncAirBaseV2,
    'LAP-V102S-WUS': VeSyncAirBaseV2,
    'LAP-V102S-WEU': VeSyncAirBaseV2,
    'LAP-V102S-AUSR': VeSyncAirBaseV2,
    'LAP-V102S-WJP': VeSyncAirBaseV2,
    
    // Vital200S Series - Using VeSyncAirBaseV2
    'LAP-V201S-AASR': VeSyncAirBaseV2,
    'LAP-V201S-WJP': VeSyncAirBaseV2,
    'LAP-V201S-WEU': VeSyncAirBaseV2,
    'LAP-V201S-WUS': VeSyncAirBaseV2,
    'LAP-V201-AUSR': VeSyncAirBaseV2,
    'LAP-V201S-AUSR': VeSyncAirBaseV2,
    'LAP-V201S-AEUR': VeSyncAirBaseV2,
    
    // EverestAir Series - Using VeSyncAirBaseV2
    'LAP-EL551S-AUS': VeSyncAirBaseV2,
    'LAP-EL551S-AEUR': VeSyncAirBaseV2,
    'LAP-EL551S-WEU': VeSyncAirBaseV2,
    'LAP-EL551S-WUS': VeSyncAirBaseV2,
    
    // LTF Series
    'LTF-F422S-KEU': VeSyncTowerFan,
    'LTF-F422S-WUSR': VeSyncTowerFan,
    'LTF-F422_WJP': VeSyncTowerFan,
    'LTF-F422S-WUS': VeSyncTowerFan,
    
    // Classic Series
    'Classic300S': VeSyncHumid200300S,
    'Classic200S': VeSyncHumid200S,
    
    // Dual Series
    'Dual200S': VeSyncHumid200300S,
    
    // LUH Series
    'LUH-A601S-WUSB': VeSyncHumid200300S,
    'LUH-A601S-AUSW': VeSyncHumid200300S,
    'LUH-D301S-WUSR': VeSyncHumid200300S,
    'LUH-D301S-WJP': VeSyncHumid200300S,
    'LUH-D301S-WEU': VeSyncHumid200300S,
    'LUH-A602S-WUSR': VeSyncHumid200300S,
    'LUH-A602S-WUS': VeSyncHumid200300S,
    'LUH-A602S-WEUR': VeSyncHumid200300S,
    'LUH-A602S-WEU': VeSyncHumid200300S,
    'LUH-A602S-WJP': VeSyncHumid200300S,
    'LUH-A602S-WUSC': VeSyncHumid200300S,
    'LUH-O451S-WEU': VeSyncHumid200300S,
    'LUH-O451S-WUS': VeSyncHumid200300S,
    'LUH-O451S-WUSR': VeSyncHumid200300S,
    'LUH-O601S-WUS': VeSyncHumid200300S,
    'LUH-O601S-KUS': VeSyncHumid200300S,
    'LUH-M101S-WUS': VeSyncHumid1000S,
    'LUH-M101S-WEUR': VeSyncHumid1000S,
    
    // LEH Series - Superior 6000S
    'LEH-S601S-WUS': VeSyncSuperior6000S,
    'LEH-S601S-WUSR': VeSyncSuperior6000S,
    
    // LV Series
    'LV-PUR131S': VeSyncAir131,
    'LV-RH131S': VeSyncAir131
};
