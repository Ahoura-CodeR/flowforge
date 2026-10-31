import { Transform } from 'class-transformer';
import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateProjectDto {
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @Matches(/^[A-Z][A-Z0-9]{1,9}$/, {
    message: 'key must be 2-10 characters: letters and digits, starting with a letter',
  })
  key: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(2000)
  description?: string;
}
