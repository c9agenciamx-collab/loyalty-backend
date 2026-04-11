import { z } from 'zod';

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color hex inválido');

export const registerAdminSchema = z.object({
  name:     z.string().min(2).max(80).trim(),
  email:    z.string().email().max(255).toLowerCase().trim(),
  password: z.string().min(8).max(128).regex(/[A-Z]/, 'Necesita mayúscula').regex(/[0-9]/, 'Necesita número'),
  bizName:  z.string().min(2).max(100).trim(),
});

export const loginSchema = z.object({
  email:    z.string().email().toLowerCase().trim(),
  password: z.string().min(1).max(128),
});

export const updateBusinessSchema = z.object({
  name:          z.string().min(2).max(100).trim().optional(),
  cardTitle:     z.string().min(1).max(80).trim().optional(),
  rewardText:    z.string().min(1).max(120).trim().optional(),
  totalStamps:   z.number().int().min(4).max(20).optional(),
  colorBg:       hexColor.optional(),
  colorText:     hexColor.optional(),
  colorStampBg:  hexColor.optional(),
  colorStampEmpty: hexColor.optional(),
  colorStampIcon:  hexColor.optional(),
  colorStampIconEmpty: hexColor.optional(),
  colorBorder:   hexColor.optional(),
  colorBorderEmpty: hexColor.optional(),
  borderWidth:   z.number().int().min(0).max(5).optional(),
  geoAlertTitle:   z.string().min(1).max(100).trim().optional(),
  geoAlertMessage: z.string().min(1).max(200).trim().optional(),
  geoRadiusMeters: z.number().int().min(50).max(1000).optional(),
  geoLat:          z.number().min(-90).max(90).optional(),
  geoLng:          z.number().min(-180).max(180).optional(),
  maxStampsPerDay: z.number().int().min(1).max(10).optional(),
  geoVerify:       z.boolean().optional(),
});

export const createMilestoneSchema = z.object({
  atStamp:   z.number().int().min(1).max(20),
  prizeName: z.string().min(1).max(150).trim(),
});

export const registerCustomerSchema = z.object({
  name:      z.string().min(2).max(80).trim(),
  email:     z.string().email().max(255).toLowerCase().trim().optional().nullable(),
  phone:     z.string().regex(/^\+?[0-9\s\-]{7,20}$/).optional().nullable(),
  pushToken: z.string().max(500).optional().nullable(),
  walletType:z.enum(['apple','google','android','wa']).optional().nullable(),
});

export const giveStampSchema = z.object({
  cardCode: z.string().regex(/^LC-\d{4}-\d{5}$/, 'Código inválido'),
  lat:      z.number().min(-90).max(90).optional(),
  lng:      z.number().min(-180).max(180).optional(),
  method:   z.enum(['QR_SCAN','MANUAL','REMOTE']).default('QR_SCAN'),
});

export const redeemSchema = z.object({
  cardCode:    z.string().regex(/^LC-\d{4}-\d{5}$/),
  milestoneId: z.string().uuid(),
});

export const sendPushSchema = z.object({
  title:   z.string().min(1).max(100).trim(),
  body:    z.string().min(1).max(300).trim(),
  segment: z.enum(['all','complete','inactive','new']).default('all'),
});

export const exportSchema = z.object({
  fields: z.array(z.enum(['name','email','phone','totalStamps','redeemedCount','createdAt','lastVisit','cardCode'])).min(1),
  format: z.enum(['csv','json']).default('csv'),
});
