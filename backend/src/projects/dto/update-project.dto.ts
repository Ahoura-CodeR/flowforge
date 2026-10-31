import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateProjectDto } from './create-project.dto';

// The key is immutable (task keys like FF-12 would break), so it's not accepted here.
export class UpdateProjectDto extends PartialType(OmitType(CreateProjectDto, ['key'] as const)) {}
