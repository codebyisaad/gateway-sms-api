package com.codebyisaad.sms.services;

import com.codebyisaad.sms.dtos.SMSDTO;
import com.codebyisaad.sms.dtos.SMSForwardResponseDTO;
import com.codebyisaad.sms.dtos.RegisterDeviceInputDTO;
import com.codebyisaad.sms.dtos.RegisterDeviceResponseDTO;
import com.codebyisaad.sms.dtos.HeartbeatInputDTO;
import com.codebyisaad.sms.dtos.HeartbeatResponseDTO;
import com.codebyisaad.sms.dtos.PendingMessagesResponseDTO;

import retrofit2.Call;
import retrofit2.http.Body;
import retrofit2.http.GET;
import retrofit2.http.Header;
import retrofit2.http.PATCH;
import retrofit2.http.POST;
import retrofit2.http.Path;

public interface GatewayApiService {
    @POST("gateway/devices")
    Call<RegisterDeviceResponseDTO> registerDevice(@Header("x-api-key") String apiKey, @Body() RegisterDeviceInputDTO body);

    @PATCH("gateway/devices/{deviceId}")
    Call<RegisterDeviceResponseDTO> updateDevice(@Path("deviceId") String deviceId, @Header("x-api-key") String apiKey, @Body() RegisterDeviceInputDTO body);

    @POST("gateway/devices/{deviceId}/receive-sms")
    Call<SMSForwardResponseDTO> sendReceivedSMS(@Path("deviceId") String deviceId, @Header("x-api-key") String apiKey, @Body() SMSDTO body);

    @PATCH("gateway/devices/{deviceId}/sms-status")
    Call<SMSForwardResponseDTO> updateSMSStatus(@Path("deviceId") String deviceId, @Header("x-api-key") String apiKey, @Body() SMSDTO body);

    @POST("gateway/devices/{deviceId}/heartbeat")
    Call<HeartbeatResponseDTO> heartbeat(@Path("deviceId") String deviceId, @Header("x-api-key") String apiKey, @Body() HeartbeatInputDTO body);

    @GET("gateway/devices/{deviceId}/messages/pending")
    Call<PendingMessagesResponseDTO> getPendingMessages(@Path("deviceId") String deviceId, @Header("x-api-key") String apiKey);
}