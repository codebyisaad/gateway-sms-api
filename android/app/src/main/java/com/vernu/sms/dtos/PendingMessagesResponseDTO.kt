package com.vernu.sms.dtos

import com.vernu.sms.models.SMSPayload

class PendingMessagesResponseDTO {
    @JvmField var data: List<SMSPayload>? = null
}
