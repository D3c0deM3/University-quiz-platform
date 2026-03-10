import {
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  Length,
} from 'class-validator';

export class RegisterWithOtpDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[0-9]{9,15}$/, { message: 'Phone number must be 9-15 digits' })
  phone: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(128)
  password: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'OTP code must be exactly 6 digits' })
  @Matches(/^[0-9]{6}$/, { message: 'OTP code must be 6 digits' })
  otpCode: string;
}
