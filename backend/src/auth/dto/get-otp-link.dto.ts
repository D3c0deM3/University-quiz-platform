import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class GetOtpLinkDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[0-9]{9,15}$/, { message: 'Phone number must be 9-15 digits' })
  phone: string;
}
