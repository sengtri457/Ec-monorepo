import hashlib
import time
from decimal import Decimal

def crc16_ccitt(data: str) -> str:
    """
    Computes CRC-16/CCITT-FALSE (Polynomial 0x1021, Initial 0xFFFF).
    Standard checksum calculation for EMVCo / NBC Bakong KHQR Tag 63.
    """
    crc = 0xFFFF
    for byte in data.encode('utf-8'):
        crc ^= (byte << 8)
        for _ in range(8):
            if crc & 0x8000:
                crc = ((crc << 1) ^ 0x1021) & 0xFFFF
            else:
                crc = (crc << 1) & 0xFFFF
    return f"{crc:04X}"

def format_tlv(tag: str, value: str) -> str:
    """Formats Tag-Length-Value according to EMVCo Merchant-Presented Mode specifications."""
    value_str = str(value)
    length = len(value_str.encode('utf-8'))
    return f"{tag}{length:02d}{value_str}"

def get_acquiring_bank(account_id: str) -> str:
    """Maps Bakong participant domain suffix to official acquiring institution name."""
    if "@" in account_id:
        domain = account_id.split("@")[1].strip().lower()
        mapping = {
            "bkrt": "Bakong",
            "abaa": "ABA Bank",
            "wing": "Wing Bank",
            "aclb": "ACLEDA Bank",
            "cani": "Canadia Bank",
            "stpc": "Sathapana Bank",
            "ftbc": "FTB Bank",
            "vdbc": "Vattanac Bank",
            "ppcb": "PPCBank",
        }
        return mapping.get(domain, "Bakong")
    return "Bakong"

def generate_khqr_payload(
    bakong_account_id: str,
    merchant_name: str,
    merchant_city: str,
    amount: Decimal,
    currency: str = "USD",
    bill_number: str = "",
    store_label: str = "DevClothes",
    phone_number: str = "",
    terminal_label: str = "",
    acquiring_bank: str = "",
    expiration_days: int = 1,
) -> str:
    """
    Constructs an EMVCo-compliant Dynamic Bakong KHQR string payload.
    """
    payload_parts = []
    payload_parts.append(format_tlv("00", "01")) # Payload Format Indicator
    payload_parts.append(format_tlv("01", "12")) # Point of Initiation Method: 12 (Dynamic QR)

    # Tag 29: Merchant Account Information
    bank_name = acquiring_bank if acquiring_bank else get_acquiring_bank(bakong_account_id)
    tag29_subtags = [
        format_tlv("00", bakong_account_id),
        format_tlv("01", bank_name),
    ]
    payload_parts.append(format_tlv("29", "".join(tag29_subtags)))

    payload_parts.append(format_tlv("52", "5691")) # Merchant Category Code: 5691 (Men's & Women's Clothing)
    currency_code = "840" if currency.upper() == "USD" else "116" # 840 = USD, 116 = KHR
    payload_parts.append(format_tlv("53", currency_code))

    amt_str = f"{amount:.2f}" if currency_code == "840" else f"{int(amount)}"
    payload_parts.append(format_tlv("54", amt_str))
    payload_parts.append(format_tlv("58", "KH")) # Country Code: KH
    payload_parts.append(format_tlv("59", merchant_name[:25])) # Merchant Name
    payload_parts.append(format_tlv("60", merchant_city[:15])) # Merchant City

    # Tag 62: Additional Data Field Template
    tag62_subtags = []
    if bill_number:
        tag62_subtags.append(format_tlv("01", bill_number))
    if phone_number:
        tag62_subtags.append(format_tlv("02", phone_number))
    if store_label:
        tag62_subtags.append(format_tlv("03", store_label))
    if terminal_label:
        tag62_subtags.append(format_tlv("07", terminal_label))

    if tag62_subtags:
        payload_parts.append(format_tlv("62", "".join(tag62_subtags)))

    raw_payload = "".join(payload_parts)
    payload_with_tag63 = raw_payload + "6304"
    checksum = crc16_ccitt(payload_with_tag63)
    return payload_with_tag63 + checksum
