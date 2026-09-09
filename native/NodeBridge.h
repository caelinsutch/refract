// Minimal declarations for the stable Node-API C ABI used by the Swift addon.
#include <stddef.h>
#include <stdbool.h>
typedef struct napi_env__* napi_env;
typedef struct napi_value__* napi_value;
typedef struct napi_callback_info__* napi_callback_info;
typedef napi_value (*napi_callback)(napi_env, napi_callback_info);
int napi_get_cb_info(napi_env, napi_callback_info, size_t*, napi_value*, napi_value*, void**);
int napi_is_buffer(napi_env, napi_value, bool*);
int napi_get_buffer_info(napi_env, napi_value, void**, size_t*);
int napi_get_boolean(napi_env, bool, napi_value*);
int napi_create_function(napi_env, const char*, size_t, napi_callback, void*, napi_value*);
int napi_set_named_property(napi_env, napi_value, const char*, napi_value);
int napi_create_string_utf8(napi_env, const char*, size_t, napi_value*);
