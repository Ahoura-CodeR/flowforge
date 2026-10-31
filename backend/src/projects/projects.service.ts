import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { isUniqueViolation } from '../common/db-errors';
import { omitUndefined } from '../common/omit-undefined';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectMember } from './project-member.entity';
import { ProjectRole } from './project-role.enum';
import { Project } from './project.entity';
import { toProjectResponse } from './project.mapper';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectsRepo: Repository<Project>,
    @InjectRepository(ProjectMember)
    private readonly membersRepo: Repository<ProjectMember>,
    private readonly dataSource: DataSource,
  ) {}

  async create(userId: string, dto: CreateProjectDto) {
    try {
      // The project and its owner membership are created together or not at all.
      const project = await this.dataSource.transaction(async (manager) => {
        const created = await manager.save(
          manager.create(Project, {
            name: dto.name,
            key: dto.key,
            description: dto.description ?? null,
          }),
        );
        await manager.save(
          manager.create(ProjectMember, {
            projectId: created.id,
            userId,
            role: ProjectRole.OWNER,
          }),
        );
        return created;
      });
      return toProjectResponse(project, ProjectRole.OWNER);
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new ConflictException(`Project key "${dto.key}" is already taken`);
      }
      throw err;
    }
  }

  async findAllForUser(userId: string) {
    const memberships = await this.membersRepo.find({
      where: { userId },
      relations: { project: true },
      order: { joinedAt: 'DESC' },
    });
    return memberships.map((m) => toProjectResponse(m.project, m.role));
  }

  async findOne(projectId: string, myRole: ProjectRole) {
    const project = await this.projectsRepo.findOne({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return toProjectResponse(project, myRole);
  }

  async update(projectId: string, dto: UpdateProjectDto, myRole: ProjectRole) {
    const result = await this.projectsRepo.update(projectId, omitUndefined(dto));
    if (result.affected === 0) {
      throw new NotFoundException('Project not found');
    }
    return this.findOne(projectId, myRole);
  }

  async remove(projectId: string): Promise<void> {
    // Members and tasks are removed by ON DELETE CASCADE.
    await this.projectsRepo.delete(projectId);
  }
}
