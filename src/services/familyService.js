// Compatibility shim for pre-V2 imports. No family/team model exists in Database V2.
// New code must import from accessService directly.
export {
  claimProfileInvitation as claimFamilyProfile,
  getAccessContext as getFamilyContext,
  getPostLoginPath,
  associateProfileEmail,
  listProfileAssociations
} from './accessService'
