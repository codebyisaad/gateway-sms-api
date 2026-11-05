package com.codebyisaad.sms.dtos

import com.codebyisaad.sms.models.SMSPayload

class PendingMessagesResponseDTO {
    @JvmField var data: List<SMSPayload>? = null
}
