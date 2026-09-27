import { useState, useRef } from 'react'
import {
  Loader2,
  Trash2,
  FileUp,
  File as FileIcon,
  Plus,
  Info,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  MetadataEditor,
  type MetadataEntry,
  metadataEntriesToObject,
} from '../../components/metadata-editor'
import {
  useMutationCreateBenefit,
  useMutationUploadPolarFile,
} from '../../queries'

export interface CreateBenefitDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (createdBenefit: any) => void
}

export const BENEFIT_TYPES = [
  { value: 'custom', label: 'Custom' },
  { value: 'discord', label: 'Discord Invite' },
  { value: 'github_repository', label: 'GitHub Repository Access' },
  { value: 'downloadables', label: 'File Downloads' },
  { value: 'license_keys', label: 'License Keys' },
  { value: 'meter_credit', label: 'Meter Credits' },
  { value: 'feature_flag', label: 'Feature Flag' },
]

export function CreateBenefitDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateBenefitDialogProps) {
  const createBenefitMutation = useMutationCreateBenefit()
  const uploadFileMutation = useMutationUploadPolarFile()

  // Base state
  const [description, setDescription] = useState('')
  const [type, setType] = useState('custom')
  const [visibility, setVisibility] = useState<'visible' | 'hidden'>('visible')

  // Custom benefit
  const [note, setNote] = useState('')

  // License keys benefit
  const [prefix, setPrefix] = useState('')
  const [hasExpires, setHasExpires] = useState(false)
  const [expiresTtl, setExpiresTtl] = useState<number>(1)
  const [expiresTimeframe, setExpiresTimeframe] = useState<
    'day' | 'month' | 'year'
  >('year')
  const [hasActivations, setHasActivations] = useState(false)
  const [activationLimit, setActivationLimit] = useState<number>(1)
  const [limitUsage, setLimitUsage] = useState<string>('')

  // Downloadables benefit
  interface UploadedFileItem {
    id: string
    name: string
    sizeReadable?: string
  }
  const [downloadableFiles, setDownloadableFiles] = useState<
    UploadedFileItem[]
  >([])
  const [manualFileId, setManualFileId] = useState('')
  const [isAddingManualFile, setIsAddingManualFile] = useState(false)
  const [fileVersion, setFileVersion] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Discord benefit
  const [discordGuildToken, setDiscordGuildToken] = useState('')
  const [discordRoleId, setDiscordRoleId] = useState('')
  const [discordKickMember, setDiscordKickMember] = useState(false)

  // GitHub repository benefit
  const [githubOwner, setGithubOwner] = useState('')
  const [githubRepo, setGithubRepo] = useState('')
  const [githubPermission, setGithubPermission] = useState('pull')

  // Meter credit benefit
  const [meterId, setMeterId] = useState('')
  const [meterUnits, setMeterUnits] = useState<number>(100)
  const [meterRollover, setMeterRollover] = useState(false)

  // Metadata
  const [metadataEntries, setMetadataEntries] = useState<MetadataEntry[]>([])
  const [isAddingMetadata, setIsAddingMetadata] = useState(false)

  const resetForm = () => {
    setDescription('')
    setType('custom')
    setVisibility('visible')
    setNote('')
    setPrefix('')
    setHasExpires(false)
    setExpiresTtl(1)
    setExpiresTimeframe('year')
    setHasActivations(false)
    setActivationLimit(1)
    setLimitUsage('')
    setDownloadableFiles([])
    setManualFileId('')
    setIsAddingManualFile(false)
    setFileVersion('')
    setDiscordGuildToken('')
    setDiscordRoleId('')
    setDiscordKickMember(false)
    setGithubOwner('')
    setGithubRepo('')
    setGithubPermission('pull')
    setMeterId('')
    setMeterUnits(100)
    setMeterRollover(false)
    setMetadataEntries([])
    setIsAddingMetadata(false)
  }

  // Handle downloadable file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const res = await uploadFileMutation.mutateAsync({
        file,
        service: 'downloadable',
        version: fileVersion || undefined,
      })
      if (res?.id) {
        setDownloadableFiles((prev) => [
          ...prev,
          {
            id: res.id,
            name: res.name || file.name,
            sizeReadable:
              res.sizeReadable || `${(file.size / 1024 / 1024).toFixed(2)} MB`,
          },
        ])
        toast.success(`File "${file.name}" uploaded to Polar`)
      }
    } catch {
      // Error handled by mutation onError
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleAddManualFile = () => {
    if (!manualFileId.trim()) return
    setDownloadableFiles((prev) => [
      ...prev,
      {
        id: manualFileId.trim(),
        name: manualFileId.trim(),
      },
    ])
    setManualFileId('')
    setIsAddingManualFile(false)
  }

  const handleRemoveFile = (index: number) => {
    setDownloadableFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleCreate = async () => {
    const trimmedDesc = description.trim()
    if (!trimmedDesc) {
      toast.error('Benefit description is required')
      return
    }

    let properties: Record<string, any> = {}

    switch (type) {
      case 'custom':
        properties = {
          note: note.trim() || null,
        }
        break

      case 'license_keys':
        properties = {
          prefix: prefix.trim() || null,
          expires: hasExpires
            ? {
                ttl: Number(expiresTtl) || 1,
                timeframe: expiresTimeframe,
              }
            : null,
          activations: hasActivations
            ? {
                limit: Number(activationLimit) || 1,
              }
            : null,
          limitUsage: limitUsage ? Number(limitUsage) : null,
        }
        break

      case 'downloadables':
        if (downloadableFiles.length === 0) {
          toast.error('Please upload at least one downloadable file')
          return
        }
        properties = {
          files: downloadableFiles.map((f) => f.id),
        }
        break

      case 'discord':
        if (!discordGuildToken.trim() || !discordRoleId.trim()) {
          toast.error('Discord Guild Token and Role ID are required')
          return
        }
        properties = {
          guildToken: discordGuildToken.trim(),
          roleId: discordRoleId.trim(),
          kickMember: discordKickMember,
        }
        break

      case 'github_repository':
        if (!githubOwner.trim() || !githubRepo.trim()) {
          toast.error('GitHub Repository Owner and Name are required')
          return
        }
        properties = {
          repositoryOwner: githubOwner.trim(),
          repositoryName: githubRepo.trim(),
          permission: githubPermission,
        }
        break

      case 'meter_credit':
        if (!meterId.trim()) {
          toast.error('Meter ID is required')
          return
        }
        properties = {
          meterId: meterId.trim(),
          units: Number(meterUnits) || 0,
          rollover: meterRollover,
        }
        break

      case 'feature_flag':
        properties = {}
        break
    }

    const metadata = metadataEntriesToObject(metadataEntries)

    try {
      const payload: any = {
        type,
        description: trimmedDesc,
        properties,
        metadata:
          metadata && Object.keys(metadata).length > 0 ? metadata : undefined,
      }

      const res = await createBenefitMutation.mutateAsync(payload)
      if (res?.id) {
        onSuccess?.(res)
        resetForm()
        onOpenChange(false)
      }
    } catch {
      // Error handled by mutation onError
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle className='text-base font-bold'>
            Create Benefit
          </DialogTitle>
          <DialogDescription className='text-muted-foreground text-xs'>
            Created benefits will be available for use in all products of your
            organization
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4 py-2'>
          {/* Description (max 42 chars) */}
          <div className='space-y-1.5'>
            <div className='flex items-center justify-between'>
              <Label className='text-xs font-semibold'>Description</Label>
              <span className='text-muted-foreground font-mono text-[11px]'>
                {description.length} / 42
              </span>
            </div>
            <Input
              placeholder='e.g. VIP Discord Channel, 500 Credits'
              maxLength={42}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Type Selector */}
          <div className='space-y-1.5'>
            <Label className='text-xs font-semibold'>Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className='w-full'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BENEFIT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Visibility: Visible vs Hidden */}
          <div className='space-y-2'>
            <Label className='text-xs font-semibold'>Visibility</Label>
            <div className='space-y-2'>
              <div
                onClick={() => setVisibility('visible')}
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors',
                  visibility === 'visible'
                    ? 'border-primary bg-primary/5'
                    : 'border-border/60 hover:bg-muted/10'
                )}
              >
                <div
                  className={cn(
                    'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border',
                    visibility === 'visible'
                      ? 'border-primary bg-primary'
                      : 'border-muted-foreground/40'
                  )}
                >
                  {visibility === 'visible' && (
                    <div className='size-1.5 rounded-full bg-white' />
                  )}
                </div>
                <div className='min-w-0 space-y-0.5'>
                  <p className='text-xs font-semibold'>Visible</p>
                  <p className='text-muted-foreground text-[11px] leading-relaxed'>
                    Customers can see this benefit after purchase, including in
                    order confirmations and the Customer Portal.
                  </p>
                </div>
              </div>

              <div
                onClick={() => setVisibility('hidden')}
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors',
                  visibility === 'hidden'
                    ? 'border-primary bg-primary/5'
                    : 'border-border/60 hover:bg-muted/10'
                )}
              >
                <div
                  className={cn(
                    'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border',
                    visibility === 'hidden'
                      ? 'border-primary bg-primary'
                      : 'border-muted-foreground/40'
                  )}
                >
                  {visibility === 'hidden' && (
                    <div className='size-1.5 rounded-full bg-white' />
                  )}
                </div>
                <div className='min-w-0 space-y-0.5'>
                  <p className='text-xs font-semibold'>Hidden</p>
                  <p className='text-muted-foreground text-[11px] leading-relaxed'>
                    Granted after purchase, but is never shown to customers.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* DYNAMIC FIELDS PER TYPE */}

          {/* 1. Custom: Private Note */}
          {type === 'custom' && (
            <div className='space-y-1.5'>
              <div className='flex items-center justify-between'>
                <Label className='text-xs font-semibold'>Private note</Label>
                <span className='text-muted-foreground text-[11px]'>
                  Markdown Format
                </span>
              </div>
              <Textarea
                placeholder='Write a secret note here. Like your private email address for premium support or link to premium content.'
                rows={4}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          )}

          {/* 2. File Downloads (downloadables) */}
          {type === 'downloadables' && (
            <div className='border-border/60 bg-muted/5 space-y-3 rounded-lg border p-3.5'>
              <div className='flex items-center justify-between'>
                <Label className='text-xs font-semibold'>
                  Downloadable Files
                </Label>
                <span className='text-muted-foreground text-[11px]'>
                  Any file type supported
                </span>
              </div>

              <input
                ref={fileInputRef}
                type='file'
                className='hidden'
                onChange={handleFileUpload}
              />

              <div
                onClick={() => {
                  if (!uploadFileMutation.isPending) {
                    fileInputRef.current?.click()
                  }
                }}
                className='border-border/60 hover:bg-muted/10 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 text-center transition-colors'
              >
                {uploadFileMutation.isPending ? (
                  <div className='flex flex-col items-center gap-2 py-1'>
                    <Loader2 className='text-primary size-5 animate-spin' />
                    <p className='text-xs font-medium'>
                      Uploading file to Polar storage...
                    </p>
                  </div>
                ) : (
                  <>
                    <FileUp className='text-muted-foreground/70 mb-1.5 size-6' />
                    <p className='text-xs font-semibold'>
                      Upload downloadable file
                    </p>
                    <p className='text-muted-foreground mt-0.5 text-[11px]'>
                      Click to browse or drag & drop.
                    </p>
                  </>
                )}
              </div>

              {/* Uploaded File List */}
              {downloadableFiles.length > 0 && (
                <div className='space-y-1.5'>
                  {downloadableFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className='border-border/60 bg-muted/10 flex items-center justify-between gap-2 rounded-md border p-2 text-xs'
                    >
                      <div className='flex min-w-0 items-center gap-2'>
                        <FileIcon className='text-primary size-4 shrink-0' />
                        <span className='truncate font-medium'>
                          {file.name}
                        </span>
                        {file.sizeReadable && (
                          <span className='text-muted-foreground shrink-0 text-[10px]'>
                            ({file.sizeReadable})
                          </span>
                        )}
                      </div>
                      <Button
                        type='button'
                        variant='ghost'
                        size='icon-sm'
                        className='text-destructive hover:text-destructive shrink-0'
                        onClick={() => handleRemoveFile(idx)}
                      >
                        <Trash2 className='size-3.5' />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className='flex items-center justify-between pt-1'>
                <Button
                  type='button'
                  variant='link'
                  size='sm'
                  className='text-muted-foreground h-auto p-0 text-xs'
                  onClick={() => setIsAddingManualFile((prev) => !prev)}
                >
                  {isAddingManualFile
                    ? 'Hide manual ID input'
                    : 'Or paste file ID manually'}
                </Button>
              </div>

              {isAddingManualFile && (
                <div className='flex items-center gap-2 pt-1'>
                  <Input
                    placeholder='Polar File ID (e.g. file_...)'
                    value={manualFileId}
                    onChange={(e) => setManualFileId(e.target.value)}
                  />
                  <Button type='button' size='sm' onClick={handleAddManualFile}>
                    Add
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* 3. License Keys */}
          {type === 'license_keys' && (
            <div className='border-border/60 bg-muted/5 space-y-3.5 rounded-lg border p-3.5'>
              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>
                  Key Prefix (Optional)
                </Label>
                <Input
                  placeholder='e.g. PRO-, LIC-, VIP-'
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                />
              </div>

              {/* Expiration */}
              <div className='border-border/40 space-y-2 border-t pt-2.5'>
                <div className='flex items-center justify-between'>
                  <div>
                    <Label className='text-xs font-semibold'>
                      Expiration Duration
                    </Label>
                    <p className='text-muted-foreground text-[11px]'>
                      Expire license key automatically after a set duration
                    </p>
                  </div>
                  <Switch
                    checked={hasExpires}
                    onCheckedChange={setHasExpires}
                  />
                </div>

                {hasExpires && (
                  <div className='grid grid-cols-2 gap-2 pt-1'>
                    <Input
                      type='number'
                      min={1}
                      value={expiresTtl}
                      onChange={(e) => setExpiresTtl(Number(e.target.value))}
                    />
                    <Select
                      value={expiresTimeframe}
                      onValueChange={(val: any) => setExpiresTimeframe(val)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='day'>Days</SelectItem>
                        <SelectItem value='month'>Months</SelectItem>
                        <SelectItem value='year'>Years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Activations */}
              <div className='border-border/40 space-y-2 border-t pt-2.5'>
                <div className='flex items-center justify-between'>
                  <div>
                    <Label className='text-xs font-semibold'>
                      Activation Limit
                    </Label>
                    <p className='text-muted-foreground text-[11px]'>
                      Max number of devices/machines key can be activated on
                    </p>
                  </div>
                  <Switch
                    checked={hasActivations}
                    onCheckedChange={setHasActivations}
                  />
                </div>

                {hasActivations && (
                  <Input
                    type='number'
                    min={1}
                    value={activationLimit}
                    onChange={(e) => setActivationLimit(Number(e.target.value))}
                  />
                )}
              </div>

              {/* Usage Limit */}
              <div className='border-border/40 space-y-1.5 border-t pt-2.5'>
                <Label className='text-xs font-semibold'>
                  Usage Limit (Optional)
                </Label>
                <Input
                  type='number'
                  min={1}
                  placeholder='Unlimited by default'
                  value={limitUsage}
                  onChange={(e) => setLimitUsage(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* 4. Discord Invite */}
          {type === 'discord' && (
            <div className='border-border/60 bg-muted/5 space-y-3 rounded-lg border p-3.5'>
              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>Guild Token</Label>
                <Input
                  placeholder='Discord Guild Token'
                  value={discordGuildToken}
                  onChange={(e) => setDiscordGuildToken(e.target.value)}
                />
              </div>
              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>Discord Role ID</Label>
                <Input
                  placeholder='e.g. 112233445566778899'
                  value={discordRoleId}
                  onChange={(e) => setDiscordRoleId(e.target.value)}
                />
              </div>
              <div className='flex items-center justify-between pt-1'>
                <div>
                  <Label className='text-xs font-semibold'>
                    Kick Member on Revoke
                  </Label>
                  <p className='text-muted-foreground text-[11px]'>
                    Remove member from server when subscription expires
                  </p>
                </div>
                <Switch
                  checked={discordKickMember}
                  onCheckedChange={setDiscordKickMember}
                />
              </div>
            </div>
          )}

          {/* 5. GitHub Repository */}
          {type === 'github_repository' && (
            <div className='border-border/60 bg-muted/5 space-y-3 rounded-lg border p-3.5'>
              <div className='grid grid-cols-2 gap-2'>
                <div className='space-y-1.5'>
                  <Label className='text-xs font-semibold'>Owner</Label>
                  <Input
                    placeholder='Organization / User'
                    value={githubOwner}
                    onChange={(e) => setGithubOwner(e.target.value)}
                  />
                </div>
                <div className='space-y-1.5'>
                  <Label className='text-xs font-semibold'>Repository</Label>
                  <Input
                    placeholder='Repo name'
                    value={githubRepo}
                    onChange={(e) => setGithubRepo(e.target.value)}
                  />
                </div>
              </div>
              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>Permission</Label>
                <Select
                  value={githubPermission}
                  onValueChange={setGithubPermission}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='pull'>Pull (Read-only)</SelectItem>
                    <SelectItem value='triage'>Triage</SelectItem>
                    <SelectItem value='push'>Push (Write)</SelectItem>
                    <SelectItem value='maintain'>Maintain</SelectItem>
                    <SelectItem value='admin'>Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* 6. Meter Credits */}
          {type === 'meter_credit' && (
            <div className='border-border/60 bg-muted/5 space-y-3 rounded-lg border p-3.5'>
              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>Meter ID</Label>
                <Input
                  placeholder='Polar Meter ID'
                  value={meterId}
                  onChange={(e) => setMeterId(e.target.value)}
                />
              </div>
              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold'>Credit Units</Label>
                <Input
                  type='number'
                  min={1}
                  value={meterUnits}
                  onChange={(e) => setMeterUnits(Number(e.target.value))}
                />
              </div>
              <div className='flex items-center justify-between pt-1'>
                <div>
                  <Label className='text-xs font-semibold'>
                    Rollover Credits
                  </Label>
                  <p className='text-muted-foreground text-[11px]'>
                    Roll unused credits over to the next billing cycle
                  </p>
                </div>
                <Switch
                  checked={meterRollover}
                  onCheckedChange={setMeterRollover}
                />
              </div>
            </div>
          )}

          {/* 7. Feature Flag */}
          {type === 'feature_flag' && (
            <div className='border-border/60 bg-muted/10 flex items-start gap-2.5 rounded-lg border p-3'>
              <Info className='text-primary mt-0.5 size-4 shrink-0' />
              <p className='text-muted-foreground text-xs leading-relaxed'>
                Feature flag entitlements are checked programmatically by your
                application through Polar Customer Benefit Grants API.
              </p>
            </div>
          )}

          {/* Metadata Section */}
          <div className='border-border/40 space-y-2 border-t pt-2'>
            <div className='flex items-center justify-between'>
              <Label className='text-xs font-semibold'>Metadata</Label>
              <Button
                type='button'
                variant='outline'
                size='sm'
                className='h-7 text-xs'
                onClick={() => setIsAddingMetadata((prev) => !prev)}
              >
                <Plus className='mr-1 size-3.5' />
                {isAddingMetadata ? 'Hide Metadata' : 'Add Metadata'}
              </Button>
            </div>

            {isAddingMetadata ? (
              <MetadataEditor
                entries={metadataEntries}
                onChange={setMetadataEntries}
              />
            ) : (
              <div className='border-border/60 bg-muted/5 rounded-lg border p-4 text-center'>
                <p className='text-muted-foreground text-xs'>
                  {metadataEntries.length > 0
                    ? `${metadataEntries.length} metadata entries configured`
                    : 'No metadata added'}
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className='gap-2 sm:gap-0'>
          <Button
            type='button'
            variant='outline'
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type='button'
            onClick={handleCreate}
            disabled={createBenefitMutation.isPending}
          >
            {createBenefitMutation.isPending && (
              <Loader2 className='mr-2 size-4 animate-spin' />
            )}
            Create & Attach
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
