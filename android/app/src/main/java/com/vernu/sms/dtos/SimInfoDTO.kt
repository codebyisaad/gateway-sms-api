package com.vernu.sms.dtos

class SimInfoDTO {
    var subscriptionId: Int = 0
    var iccId: String? = null
    var cardId: Int? = null
    var carrierName: String? = null
    var displayName: String? = null
    var simSlotIndex: Int? = null
    var mcc: String? = null
    var mnc: String? = null
    var countryIso: String? = null
    var subscriptionType: String? = null

    // Radio state at collection time, so a quiet device can be explained
    var serviceState: String? = null
    var simState: String? = null
    var isRoaming: Boolean? = null
    var signalLevel: Int? = null
}
