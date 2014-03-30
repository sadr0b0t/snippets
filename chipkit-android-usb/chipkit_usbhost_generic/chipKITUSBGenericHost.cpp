/************************************************************************/
/*																		*/
/*	chipKITUSBGenericHost.cpp	-- USB Generic Host Class                       */
/*                         Generic Host Class thunk layer to the MAL        */
/*																		*/
/************************************************************************/
/*	Author: 	Keith Vogel 											*/
/*	Copyright 2011, Digilent Inc.										*/
/************************************************************************/
/*
  This library is free software; you can redistribute it and/or
  modify it under the terms of the GNU Lesser General Public
  License as published by the Free Software Foundation; either
  version 2.1 of the License, or (at your option) any later version.

  This library is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
  Lesser General Public License for more details.

  You should have received a copy of the GNU Lesser General Public
  License along with this library; if not, write to the Free Software
  Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA
*/
/************************************************************************/
/*  Module Description: 												*/
/*  Just a class wrapper of the MAL Generic HOST code                       */
/*																		*/
/************************************************************************/
/*  Revision History:													*/
/*																		*/
/*	9/06/2011(KeithV): Created											*/
/*																		*/
/************************************************************************/

#include "chipKITUSBHost.h"
#include "chipKITUSBGenericHost.h"

//******************************************************************************
//******************************************************************************
// Thunks to the Generic USB HOST code in the MAL
//******************************************************************************
//******************************************************************************

BOOL ChipKITUSBGenericHost::Init ( uint8_t address, DWORD flags, uint8_t clientDriverID )
{
    return(USBHostGenericInit(address, flags, clientDriverID));
}

BOOL ChipKITUSBGenericHost::EventHandler ( uint8_t address, USB_EVENT event, void *data, DWORD size )
{
    return(USBHostGenericEventHandler(address, event, data, size));
}

BOOL ChipKITUSBGenericHost::GetDeviceAddress(GENERIC_DEVICE_ID *pDevID)
{
    return(USBHostGenericGetDeviceAddress(pDevID));
}

uint8_t ChipKITUSBGenericHost::Read( uint8_t deviceAddress, void *buffer, DWORD length)
{
    return(USBHostGenericRead(deviceAddress, buffer, length));
}

BOOL ChipKITUSBGenericHost::RxIsComplete( uint8_t deviceAddress,
                                   uint8_t *errorCode, DWORD *byteCount )
{
    return(USBHostGenericRxIsComplete(deviceAddress, errorCode, byteCount));
}

#ifndef USB_ENABLE_TRANSFER_EVENT
void ChipKITUSBGenericHost::Tasks( void )
{
    USBHostGenericTasks();
}
#endif

BOOL ChipKITUSBGenericHost::TxIsComplete( uint8_t deviceAddress, uint8_t *errorCode )
{
    return(USBHostGenericTxIsComplete(deviceAddress, errorCode));
}

uint8_t ChipKITUSBGenericHost::Write( uint8_t deviceAddress, void *buffer, DWORD length)
{
    return(USBHostGenericWrite(deviceAddress, buffer, length));
}

//******************************************************************************
//******************************************************************************
// Instantiate the Generic Class
//******************************************************************************
//******************************************************************************
ChipKITUSBGenericHost USBGenericHost;

